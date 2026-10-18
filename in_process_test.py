"""
In-process direct verification of GestureLink AI FastAPI logic.
Runs completely offline and tests all functions, validations, models, and states.
"""
import json
import os
import sys

from app import (
    app,
    health,
    predict,
    execute_action,
    reset,
    get_devices,
    get_events,
    get_metrics,
    PredictRequest,
    ActionRequest,
    ACTIONS,
    device_state
)
from fastapi import HTTPException

def run_tests():
    print("==================================================")
    print("  GESTURELINK AI: IN-PROCESS VERIFICATION SUITE")
    print("==================================================")

    # 1. Health check
    print("\n--- 1. Testing health() ---")
    h = health()
    assert h["ok"] is True
    assert len(h["model_classes"]) == 8
    assert len(h["features_required"]) == 19
    assert h["synthetic_data_warning"] is True
    print(f"✓ Health verified: {len(h['model_classes'])} classes, {len(h['features_required'])} features.")

    # 2. Prediction check
    print("\n--- 2. Testing predict() with sample_prediction_request.json ---")
    with open("sample_prediction_request.json") as f:
        sample = json.load(f)
    req = PredictRequest(features=sample["features"])
    pred = predict(req)
    assert pred["gesture"] in ACTIONS
    assert pred["confidence"] >= 0.60
    assert pred["synthetic_data_warning"] is True
    print(f"✓ Predict verified: predicted '{pred['gesture']}' with {pred['confidence']*100:.2f}% confidence.")
    print(f"  Mapped action: {pred['action']}")

    # 3. Missing features validation
    print("\n--- 3. Testing predict() feature validation ---")
    try:
        predict(PredictRequest(features={"nose_x": 0.5}))
        assert False, "Should have raised HTTPException 422"
    except HTTPException as e:
        assert e.status_code == 422
        print(f"✓ Missing features correctly raised HTTPException 422: {e.detail}")

    # 4. Eight Gesture Actions Mapping
    print("\n--- 4. Testing All 8 Gesture Actions ---")
    reset()

    # 4.1 idle
    r = execute_action(ActionRequest(gesture="idle", confidence=0.95))
    assert r["accepted"] is True
    assert r["state"]["light"] == "OFF"
    assert r["state"]["relay"] == "OFF"
    assert r["state"]["servo_angle"] == 0
    print("  ✓ idle -> no action verified")

    # 4.2 right_hand_up -> light ON
    r = execute_action(ActionRequest(gesture="right_hand_up", confidence=0.92))
    assert r["state"]["light"] == "ON"
    print("  ✓ right_hand_up -> light ON verified")

    # 4.3 left_hand_up -> light OFF
    r = execute_action(ActionRequest(gesture="left_hand_up", confidence=0.91))
    assert r["state"]["light"] == "OFF"
    print("  ✓ left_hand_up -> light OFF verified")

    # 4.4 both_hands_up -> relay toggle
    r = execute_action(ActionRequest(gesture="both_hands_up", confidence=0.88))
    assert r["state"]["relay"] == "ON"
    print("  ✓ both_hands_up -> relay toggle to ON verified")

    r = execute_action(ActionRequest(gesture="both_hands_up", confidence=0.89))
    assert r["state"]["relay"] == "OFF"
    print("  ✓ both_hands_up -> relay toggle to OFF verified")

    # 4.5 right_arm_out -> servo 90
    r = execute_action(ActionRequest(gesture="right_arm_out", confidence=0.96))
    assert r["state"]["servo_angle"] == 90
    print("  ✓ right_arm_out -> servo 90° verified")

    # 4.6 left_arm_out -> servo 0
    r = execute_action(ActionRequest(gesture="left_arm_out", confidence=0.94))
    assert r["state"]["servo_angle"] == 0
    print("  ✓ left_arm_out -> servo 0° verified")

    # 4.7 arms_crossed -> emergency relay OFF
    execute_action(ActionRequest(gesture="both_hands_up", confidence=0.90))
    r = execute_action(ActionRequest(gesture="arms_crossed", confidence=0.98))
    assert r["state"]["relay"] == "OFF"
    print("  ✓ arms_crossed -> emergency relay OFF verified")

    # 4.8 hands_together -> servo home 0
    execute_action(ActionRequest(gesture="right_arm_out", confidence=0.95))
    r = execute_action(ActionRequest(gesture="hands_together", confidence=0.93))
    assert r["state"]["servo_angle"] == 0
    print("  ✓ hands_together -> servo home 0° verified")

    # 5. Confidence rejection
    print("\n--- 5. Testing Confidence Threshold (<0.60 Rejection) ---")
    r = execute_action(ActionRequest(gesture="right_hand_up", confidence=0.58))
    assert r["accepted"] is False
    assert r["reason"] == "confidence_below_0.60"
    print("✓ Confidence 0.58 rejected with reason 'confidence_below_0.60'.")

    # 6. PRD vocabulary gating
    print("\n--- 6. Testing PRD Gating Rule ---")
    try:
        execute_action(ActionRequest(gesture="right_hand_up", confidence=0.95, publish_mqtt=True))
        assert False, "Should have raised HTTPException 409"
    except HTTPException as e:
        assert e.status_code == 409
        print(f"✓ PRD vocabulary mismatch correctly raised HTTPException 409: {e.detail}")

    # 7. Reset test
    print("\n--- 7. Testing Reset Behavior ---")
    execute_action(ActionRequest(gesture="right_hand_up", confidence=0.95))
    execute_action(ActionRequest(gesture="right_arm_out", confidence=0.95))
    rst = reset()
    assert rst["state"]["light"] == "OFF"
    assert rst["state"]["relay"] == "OFF"
    assert rst["state"]["servo_angle"] == 0
    assert rst["state"]["mode"] == "SIMULATED"
    print("✓ Reset verified: all devices returned to default state.")

    # 8. Events timeline test
    print("\n--- 8. Testing Events Log ---")
    evs = get_events()
    assert len(evs) > 0
    print(f"✓ Events log verified: {len(evs)} events tracked.")

    # 9. Metrics test
    print("\n--- 9. Testing Metrics Retrieval ---")
    m = get_metrics()
    assert m["validation_accuracy"] > 0.99
    assert m["test_accuracy"] >= 0.98
    print(f"✓ Metrics verified: {m['validation_accuracy']*100:.2f}% val, {m['test_accuracy']*100:.2f}% test.")

    print("\n==================================================")
    print("  ALL 9 IN-PROCESS TESTS PASSED! (100% PASS)")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
