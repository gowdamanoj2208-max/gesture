import os
import json
import time
import warnings
from typing import Optional, Dict, Any, List
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Filter non-critical scikit-learn unpickle warnings
warnings.filterwarnings("ignore", category=UserWarning)

ROOT = os.path.dirname(__file__)

# Load model bundle and training metrics
bundle_path = os.path.join(ROOT, "gesture_model.joblib")
metrics_path = os.path.join(ROOT, "training_metrics.json")

if not os.path.exists(bundle_path):
    raise RuntimeError(f"Trained model bundle not found at {bundle_path}")

bundle = joblib.load(bundle_path)
model = bundle["model"]
FEATURES = bundle["feature_cols"]

training_metrics = {}
if os.path.exists(metrics_path):
    with open(metrics_path, "r") as f:
        training_metrics = json.load(f)

app = FastAPI(
    title="GestureLink AI API",
    version="1.0.0",
    description="AI-Powered Gesture-Controlled Devices: Computer Vision Inference & Device Simulator"
)

# Enable CORS for local development and dashboard access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

events: List[Dict[str, Any]] = []
device_state = {
    "relay": "OFF",
    "servo_angle": 0,
    "light": "OFF",
    "mode": "SIMULATED",
    "hardware_confirmed": False,
    "last_gesture": "idle",
    "last_updated": int(time.time())
}

mqtt_client = None

# 8 Dataset gesture classes and their intended actions
ACTIONS = {
    "idle": {"device_type": "none", "device_action": "no_action", "action_value": 0, "description": "No action"},
    "right_hand_up": {"device_type": "light", "device_action": "light_on", "action_value": 1, "description": "Light ON"},
    "left_hand_up": {"device_type": "light", "device_action": "light_off", "action_value": 0, "description": "Light OFF"},
    "both_hands_up": {"device_type": "relay", "device_action": "relay_toggle", "action_value": 1, "description": "Relay Toggle"},
    "right_arm_out": {"device_type": "servo", "device_action": "servo_rotate_right", "action_value": 90, "description": "Servo to 90°"},
    "left_arm_out": {"device_type": "servo", "device_action": "servo_rotate_left", "action_value": 0, "description": "Servo to 0°"},
    "arms_crossed": {"device_type": "relay", "device_action": "relay_off_emergency_stop", "action_value": 0, "description": "Emergency Relay OFF"},
    "hands_together": {"device_type": "servo", "device_action": "servo_home", "action_value": 0, "description": "Servo Home (0°)"},
}

# ESP32 PRD expected gestures: open_palm, fist, point_left, point_right
PRD_GESTURES = {
    "open_palm": {"device_type": "relay", "device_action": "relay_on", "action_value": 1},
    "fist": {"device_type": "relay", "device_action": "relay_off", "action_value": 0},
    "point_left": {"device_type": "servo", "device_action": "servo_0_deg", "action_value": 0},
    "point_right": {"device_type": "servo", "device_action": "servo_90_deg", "action_value": 90},
}

class PredictRequest(BaseModel):
    features: Dict[str, float]

class ActionRequest(BaseModel):
    gesture: str
    confidence: float = Field(ge=0.0, le=1.0)
    publish_mqtt: bool = False
    adapter_mode: Optional[str] = None  # None | "explicit_mapped"

def apply_simulated_action(gesture: str) -> Dict[str, Any]:
    a = ACTIONS[gesture]
    if a["device_type"] == "light":
        device_state["light"] = "ON" if a["action_value"] == 1 else "OFF"
    elif a["device_type"] == "relay":
        if gesture == "arms_crossed":
            device_state["relay"] = "OFF"
        elif gesture == "both_hands_up":
            device_state["relay"] = "OFF" if device_state["relay"] == "ON" else "ON"
    elif a["device_type"] == "servo":
        device_state["servo_angle"] = int(a["action_value"])
    
    device_state["last_gesture"] = gesture
    device_state["last_updated"] = int(time.time())
    return a

def get_mqtt_status() -> Dict[str, Any]:
    host = os.getenv("MQTT_BROKER_HOST", "").strip()
    port = int(os.getenv("MQTT_BROKER_PORT", "1883"))
    topic = os.getenv("MQTT_TOPIC", "gestureloop/gesture")
    adapter_enabled = os.getenv("HARDWARE_ADAPTER_ENABLED", "false").lower() in ("true", "1", "yes")
    
    return {
        "configured": bool(host),
        "broker_host": host or None,
        "broker_port": port,
        "topic": topic,
        "adapter_enabled": adapter_enabled,
        "connected": mqtt_client is not None and getattr(mqtt_client, "is_connected", lambda: False)(),
        "status": "CONFIGURED" if host else "UNCONFIGURED"
    }

def publish_to_mqtt(payload: dict) -> Dict[str, Any]:
    global mqtt_client
    host = os.getenv("MQTT_BROKER_HOST", "").strip()
    if not host:
        raise HTTPException(status_code=400, detail="MQTT_BROKER_HOST is not configured in environment.")
    
    port = int(os.getenv("MQTT_BROKER_PORT", "1883"))
    topic = os.getenv("MQTT_TOPIC", "gestureloop/gesture")
    
    try:
        import paho.mqtt.client as mqtt
        if mqtt_client is None:
            mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="gestureloop-vision")
            mqtt_client.connect(host, port, 10)
            mqtt_client.loop_start()
        
        info = mqtt_client.publish(topic, json.dumps(payload), qos=0)
        info.wait_for_publish(timeout=2.0)
        return {"published": True, "topic": topic, "hardware_confirmed": False, "note": "Dispatched to broker; pending physical hardware telemetry"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"MQTT publish failed: {str(e)}")

@app.get("/api/health")
def health():
    return {
        "ok": True,
        "model_classes": list(model.classes_),
        "class_count": len(model.classes_),
        "features_required": FEATURES,
        "feature_count": len(FEATURES),
        "device_state": device_state,
        "mqtt": get_mqtt_status(),
        "synthetic_data_warning": True,
        "note": "Synthetic keypoint dataset metrics (99.33% val / 98.00% test); not evidence of real-world webcam accuracy."
    }

@app.get("/api/metrics")
def get_metrics():
    return training_metrics

@app.get("/api/devices")
def get_devices():
    return device_state

@app.get("/api/events")
def get_events():
    # Return last 100 events, newest first
    return list(reversed(events[-100:]))

@app.post("/api/predict")
def predict(req: PredictRequest):
    missing = [f for f in FEATURES if f not in req.features]
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing feature(s): {missing}")
    
    # Form 2D DataFrame with explicit column names to match model training feature names
    x = pd.DataFrame([[float(req.features[f]) for f in FEATURES]], columns=FEATURES)
    probs = model.predict_proba(x)[0]
    idx = int(np.argmax(probs))
    gesture = str(model.classes_[idx])
    confidence = float(probs[idx])
    
    action_info = ACTIONS.get(gesture, {"device_type": "none", "device_action": "no_action", "action_value": 0})
    
    return {
        "gesture": gesture,
        "confidence": round(confidence, 4),
        "all_probabilities": {str(cls_): round(float(prob), 4) for cls_, prob in zip(model.classes_, probs)},
        "action": action_info,
        "synthetic_data_warning": True,
        "note": "Model trained on synthetic keypoints. Real webcam performance may vary."
    }

@app.post("/api/action")
def execute_action(req: ActionRequest):
    is_dataset_gesture = req.gesture in ACTIONS
    is_prd_gesture = req.gesture in PRD_GESTURES
    
    if not is_dataset_gesture and not is_prd_gesture:
        raise HTTPException(status_code=400, detail=f"Unknown gesture '{req.gesture}'. Expected one of 8 dataset classes or 4 PRD classes.")
    
    # Enforce minimum confidence threshold of 0.60
    if req.confidence < 0.60:
        return {
            "accepted": False,
            "reason": "confidence_below_0.60",
            "threshold": 0.60,
            "received_confidence": req.confidence,
            "state": device_state
        }
    
    # Check PRD compatibility rule:
    # Do not send dataset labels directly to the ESP32 PRD topic; it expects a different vocabulary.
    mqtt_result = None
    if req.publish_mqtt:
        if is_dataset_gesture and not is_prd_gesture:
            # If explicit mapped adapter is requested
            if req.adapter_mode == "explicit_mapped":
                # Validated adapter mapping
                # right_hand_up / both_hands_up -> open_palm (relay ON)
                # left_hand_up / arms_crossed -> fist (relay OFF)
                # left_arm_out / hands_together -> point_left (servo 0)
                # right_arm_out -> point_right (servo 90)
                mapping = {
                    "right_hand_up": "open_palm",
                    "both_hands_up": "open_palm",
                    "left_hand_up": "fist",
                    "arms_crossed": "fist",
                    "left_arm_out": "point_left",
                    "hands_together": "point_left",
                    "right_arm_out": "point_right"
                }
                mapped = mapping.get(req.gesture)
                if mapped:
                    mqtt_payload = {"gesture": mapped, "confidence": round(req.confidence, 4), "ts": int(time.time())}
                    mqtt_result = publish_to_mqtt(mqtt_payload)
                else:
                    raise HTTPException(status_code=400, detail=f"No adapter mapping for gesture '{req.gesture}'")
            else:
                raise HTTPException(
                    status_code=409,
                    detail="Dataset gesture labels (8 classes) do not match ESP32 PRD labels (open_palm, fist, point_left, point_right). Add a validated gesture adapter before publishing to MQTT."
                )
        elif is_prd_gesture:
            mqtt_payload = {"gesture": req.gesture, "confidence": round(req.confidence, 4), "ts": int(time.time())}
            mqtt_result = publish_to_mqtt(mqtt_payload)

    state_before = dict(device_state)
    
    if is_dataset_gesture:
        action_info = apply_simulated_action(req.gesture)
    else:
        # PRD gesture simulated action
        prd_info = PRD_GESTURES[req.gesture]
        if prd_info["device_type"] == "relay":
            device_state["relay"] = "ON" if prd_info["action_value"] == 1 else "OFF"
        elif prd_info["device_type"] == "servo":
            device_state["servo_angle"] = int(prd_info["action_value"])
        device_state["last_gesture"] = req.gesture
        device_state["last_updated"] = int(time.time())
        action_info = prd_info
        
    event = {
        "id": len(events) + 1,
        "gesture": req.gesture,
        "confidence": round(req.confidence, 4),
        "ts": int(time.time()),
        "time_str": time.strftime("%H:%M:%S", time.localtime()),
        "action": action_info,
        "state_before": state_before,
        "state_after": dict(device_state),
        "mode": device_state["mode"],
        "hardware_confirmed": False,
        "mqtt": mqtt_result
    }
    
    events.append(event)
    # Keep event log bounded to last 200 events
    if len(events) > 200:
        events.pop(0)
        
    return {
        "accepted": True,
        "action": action_info,
        "state": device_state,
        "event": event,
        "mqtt": mqtt_result
    }

@app.post("/api/reset")
def reset():
    global events
    device_state.update({
        "relay": "OFF",
        "servo_angle": 0,
        "light": "OFF",
        "mode": "SIMULATED",
        "hardware_confirmed": False,
        "last_gesture": "idle",
        "last_updated": int(time.time())
    })
    events.append({
        "id": len(events) + 1,
        "gesture": "SYSTEM_RESET",
        "confidence": 1.0,
        "ts": int(time.time()),
        "time_str": time.strftime("%H:%M:%S", time.localtime()),
        "action": {"device_type": "all", "device_action": "reset_defaults", "action_value": 0, "description": "Reset devices to default (Relay OFF, Light OFF, Servo 0°)"},
        "state_before": {},
        "state_after": dict(device_state),
        "mode": "SIMULATED",
        "hardware_confirmed": False,
        "mqtt": None
    })
    return {"message": "Demo reset to default state", "state": device_state}

# Mount static build files if dist/ directory exists
dist_dir = os.path.join(ROOT, "dist")
if os.path.exists(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static")

