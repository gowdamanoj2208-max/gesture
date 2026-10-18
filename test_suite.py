"""
GestureLink AI Live HTTP Verification Test Suite
Tests all endpoints against a live FastAPI server using Python's built-in urllib.
Verifies all 8 gesture mappings, confidence threshold, PRD compatibility gating,
reset behavior, and model predictions.
"""
import json
import os
import sys
import urllib.request
import urllib.error

BASE_URL = os.getenv("TEST_SERVER_URL", "http://127.0.0.1:8000")

def req(path: str, method: str = "GET", data: dict = None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data is not None else None
    
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            return status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            parsed = json.loads(content)
        except Exception:
            parsed = {"raw": content}
        return e.code, parsed

def test_health():
    print("\n--- 1. Testing GET /api/health ---")
    status, data = req("/api/health")
    assert status == 200, f"Expected 200, got {status}: {data}"
    assert data["ok"] is True
    assert len(data["model_classes"]) == 8
    assert len(data["features_required"]) == 19
    assert data["synthetic_data_warning"] is True
    print("✓ Health check passed:")
    print(f"  Classes ({len(data['model_classes'])}): {data['model_classes']}")
    print(f"  Features count: {len(data['features_required'])}")
    print(f"  Device state: {data['device_state']}")

def test_prediction():
    print("\n--- 2. Testing POST /api/predict with sample_prediction_request.json ---")
    sample_path = os.path.join(os.path.dirname(__file__), "sample_prediction_request.json")
    with open(sample_path) as f:
        payload = json.load(f)
    
    status, data = req("/api/predict", method="POST", data=payload)
    assert status == 200, f"Expected 200, got {status}: {data}"
    assert "gesture" in data
    assert "confidence" in data
    assert data["confidence"] > 0.60
    assert data["synthetic_data_warning"] is True
    print(f"✓ Predict check passed: predicted '{data['gesture']}' with {data['confidence']*100:.2f}% confidence.")
    print(f"  Action mapped: {data['action']}")

def test_missing_features_prediction():
    print("\n--- 3. Testing POST /api/predict feature validation ---")
    bad_req = {"features": {"nose_x": 0.5}}
    status, data = req("/api/predict", method="POST", data=bad_req)
    assert status == 422, f"Expected 422 validation error, got {status}: {data}"
    print(f"✓ Missing features correctly rejected with HTTP 422: {data.get('detail')}")

def test_eight_gesture_actions():
    print("\n--- 4. Testing All 8 Gesture-to-Action Mappings ---")
    # Reset first
    status, _ = req("/api/reset", method="POST")
    assert status == 200
    
    # 1. idle -> no action
    status, res = req("/api/action", method="POST", data={"gesture": "idle", "confidence": 0.95})
    assert status == 200 and res["accepted"] is True
    assert res["state"]["light"] == "OFF"
    assert res["state"]["relay"] == "OFF"
    assert res["state"]["servo_angle"] == 0
    print("  ✓ idle -> no action verified")

    # 2. right_hand_up -> light ON
    status, res = req("/api/action", method="POST", data={"gesture": "right_hand_up", "confidence": 0.92})
    assert status == 200
    assert res["state"]["light"] == "ON"
    print("  ✓ right_hand_up -> light ON verified")

    # 3. left_hand_up -> light OFF
    status, res = req("/api/action", method="POST", data={"gesture": "left_hand_up", "confidence": 0.91})
    assert status == 200
    assert res["state"]["light"] == "OFF"
    print("  ✓ left_hand_up -> light OFF verified")

    # 4. both_hands_up -> relay toggle (OFF -> ON)
    status, res = req("/api/action", method="POST", data={"gesture": "both_hands_up", "confidence": 0.88})
    assert status == 200
    assert res["state"]["relay"] == "ON"
    print("  ✓ both_hands_up -> relay toggled to ON verified")

    # 4b. both_hands_up again -> relay toggle (ON -> OFF)
    status, res = req("/api/action", method="POST", data={"gesture": "both_hands_up", "confidence": 0.89})
    assert status == 200
    assert res["state"]["relay"] == "OFF"
    print("  ✓ both_hands_up -> relay toggled to OFF verified")

    # 5. right_arm_out -> servo to 90
    status, res = req("/api/action", method="POST", data={"gesture": "right_arm_out", "confidence": 0.96})
    assert status == 200
    assert res["state"]["servo_angle"] == 90
    print("  ✓ right_arm_out -> servo to 90° verified")

    # 6. left_arm_out -> servo to 0
    status, res = req("/api/action", method="POST", data={"gesture": "left_arm_out", "confidence": 0.94})
    assert status == 200
    assert res["state"]["servo_angle"] == 0
    print("  ✓ left_arm_out -> servo to 0° verified")

    # 7. arms_crossed -> emergency relay OFF
    # Turn relay ON first
    req("/api/action", method="POST", data={"gesture": "both_hands_up", "confidence": 0.90})
    status, res = req("/api/action", method="POST", data={"gesture": "arms_crossed", "confidence": 0.98})
    assert status == 200
    assert res["state"]["relay"] == "OFF"
    print("  ✓ arms_crossed -> emergency relay OFF verified")

    # 8. hands_together -> servo home at 0
    req("/api/action", method="POST", data={"gesture": "right_arm_out", "confidence": 0.95})
    status, res = req("/api/action", method="POST", data={"gesture": "hands_together", "confidence": 0.93})
    assert status == 200
    assert res["state"]["servo_angle"] == 0
    print("  ✓ hands_together -> servo home at 0° verified")

def test_confidence_rejection():
    print("\n--- 5. Testing Confidence Threshold (<0.60 Rejection) ---")
    status, res = req("/api/action", method="POST", data={"gesture": "right_hand_up", "confidence": 0.55})
    assert status == 200
    assert res["accepted"] is False
    assert res["reason"] == "confidence_below_0.60"
    print("✓ Confidence 0.55 rejected cleanly with reason 'confidence_below_0.60'.")

def test_prd_vocabulary_gating():
    print("\n--- 6. Testing PRD Vocabulary Mismatch Rule ---")
    status, res = req("/api/action", method="POST", data={
        "gesture": "right_hand_up",
        "confidence": 0.95,
        "publish_mqtt": True
    })
    assert status == 409, f"Expected 409 conflict, got {status}: {res}"
    print(f"✓ Publishing dataset gesture to MQTT correctly blocked with HTTP 409:")
    print(f"  Detail: {res.get('detail')}")

def test_reset():
    print("\n--- 7. Testing Reset Endpoint ---")
    req("/api/action", method="POST", data={"gesture": "right_hand_up", "confidence": 0.95})
    req("/api/action", method="POST", data={"gesture": "right_arm_out", "confidence": 0.95})
    
    status, res = req("/api/reset", method="POST")
    assert status == 200
    st = res["state"]
    assert st["relay"] == "OFF"
    assert st["light"] == "OFF"
    assert st["servo_angle"] == 0
    assert st["mode"] == "SIMULATED"
    print("✓ Reset verified: all devices returned to safe default state.")

def test_events_timeline():
    print("\n--- 8. Testing Events Log Retrieval ---")
    status, evs = req("/api/events")
    assert status == 200
    assert isinstance(evs, list)
    assert len(evs) > 0
    print(f"✓ Events endpoint verified: {len(evs)} events recorded in history.")

if __name__ == "__main__":
    print("==================================================")
    print("  GESTURELINK AI: LIVE SERVER VERIFICATION SUITE")
    print("==================================================")
    try:
        test_health()
        test_prediction()
        test_missing_features_prediction()
        test_eight_gesture_actions()
        test_confidence_rejection()
        test_prd_vocabulary_gating()
        test_reset()
        test_events_timeline()
        print("\n==================================================")
        print("  ALL 8 TESTS PASSED SUCCESSFULLY! (100% PASS)")
        print("==================================================")
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        sys.exit(1)
