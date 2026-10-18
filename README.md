# GestureLink AI — AI-Powered Gesture-Controlled Devices

**Hackathon MVP Demo Console & Edge Vision Actuator Pipeline**

GestureLink AI bridges browser-based real-time Computer Vision (MediaPipe Pose) and edge IoT hardware actuation. It captures upper-body skeleton keypoints from a standard webcam, extracts a 19-dimensional normalized geometric feature vector, infers posture through a Random Forest classifier, and safely executes mapped device commands on an interactive IoT dashboard (with support for ESP32 DevKit microcontrollers over MQTT).

---

## 🚀 Quick Start Instructions

### Prerequisites
- Python 3.10+ (tested on Python 3.10 – 3.14 on macOS / Linux / Windows)
- Node.js 18+ and npm 9+

---

### 1. Backend Setup & Run

In the project root:

```bash
# 1. Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start the FastAPI backend server
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

- API Base URL: `http://127.0.0.1:8000`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`
- Health Endpoint: `http://127.0.0.1:8000/api/health`
- Built Dashboard UI: `http://127.0.0.1:8000/` (FastAPI automatically serves the compiled production build from `dist/`)

---

### 2. Frontend Development Server

In a separate terminal (in the same project root):

```bash
# 1. Install frontend packages
npm install

# 2. Launch Vite development server
npm run dev
```

- Open: `http://127.0.0.1:5173/`
- Vite automatically proxies `/api` calls to `http://127.0.0.1:8000`.

---

## ⚡ Verified Test Suites

Run both automated verification suites to validate all endpoints, models, thresholds, and mappings:

```bash
# In-process test suite (runs 100% offline, zero network dependencies)
.venv/bin/python in_process_test.py

# Live HTTP socket test suite (validates live FastAPI server)
.venv/bin/python test_suite.py
```

### Verified Test Matrix
| # | Test Case | Target Endpoint | Result |
|---|---|---|---|
| 1 | Health Check & Class Verification | `GET /api/health` | **PASSED** (8 classes, 19 features) |
| 2 | Sample Feature Inference | `POST /api/predict` | **PASSED** (`right_arm_out`, 99.75% conf) |
| 3 | Input Feature Validation | `POST /api/predict` | **PASSED** (Missing features return HTTP 422) |
| 4 | Eight Dataset Gesture Actions | `POST /api/action` | **PASSED** (All 8 device transitions verified) |
| 5 | Confidence Gating (<0.60) | `POST /api/action` | **PASSED** (0.55 rejected with `confidence_below_0.60`) |
| 6 | PRD Compatibility Rule | `POST /api/action` | **PASSED** (Raw dataset publish blocked with HTTP 409) |
| 7 | Emergency Relay E-Stop | `POST /api/action` | **PASSED** (`arms_crossed` forces relay OFF) |
| 8 | System State Reset | `POST /api/reset` | **PASSED** (Light OFF, Relay OFF, Servo 0°) |
| 9 | Action Telemetry Timeline | `GET /api/events` | **PASSED** (Reverse chronological bounded log) |

---

## 🧠 System Architecture

```
[Webcam Feed]
      │
      ▼
[MediaPipe Pose Landmarker] (Upper body 7 keypoints: nose, shoulders, elbows, wrists)
      │
      ▼
[19-Feature Vector Extractor]
 ├── Normalized coordinates: nose, l/r shoulders, l/r elbows, l/r wrists (14 floats)
 ├── Joint angles: l_elbow_angle, r_elbow_angle (2 floats, degrees)
 └── Relative metrics: l_wrist_rel_y, r_wrist_rel_y, wrist_distance (3 floats, normalized by shoulder width)
      │
      ▼
[FastAPI /api/predict] ──> [gesture_model.joblib] (Random Forest, 400 trees)
      │
      ├── Confidence Gating (threshold >= 0.60, 1.5s debounce cooldown)
      ▼
[Device Simulator & Event Log]
 ├── Smart Light (ON / OFF)
 ├── Power Relay (ON / OFF / Emergency Stop)
 └── PWM Servo (0° to 90°)
      │
      ▼ (Gated behind explicit adapter)
[ESP32 PRD MQTT Adapter] ──> [Topic: gestureloop/gesture] ──> [ESP32 DevKit]
```

---

## 📋 The 8-Class Dataset Actions vs. ESP32 PRD Compatibility

### 1. Dataset Vocabulary & Action Mappings (8 Classes)
| Dataset Gesture Label | Actuator Target | Action Executed | Device State Result |
|---|---|---|---|
| `idle` | None | No action | Standby |
| `right_hand_up` | Light | Light ON | `light: ON` |
| `left_hand_up` | Light | Light OFF | `light: OFF` |
| `both_hands_up` | Relay | Relay Toggle | `relay: ON ⇄ OFF` |
| `right_arm_out` | Servo | Rotate Right to 90° | `servo_angle: 90` |
| `left_arm_out` | Servo | Rotate Left to 0° | `servo_angle: 0` |
| `arms_crossed` | Relay | Emergency Stop Relay OFF | `relay: OFF` |
| `hands_together` | Servo | Return to Home (0°) | `servo_angle: 0` |

### 2. ESP32 Firmware PRD Vocabulary (4 Hand Gestures)
The ESP32 firmware specification (`ESP32_Gesture_Actuator_PRD_v2.md`) expects 4 specific hand gestures:
- `open_palm` &rarr; Relay ON
- `fist` &rarr; Relay OFF
- `point_left` &rarr; Servo to 0°
- `point_right` &rarr; Servo to 90°

> [!WARNING]
> **PRD Compatibility Rule**:
> Dataset labels (`right_hand_up`, `both_hands_up`, etc.) **must never** be sent directly to the ESP32 PRD MQTT topic (`gestureloop/gesture`). The backend actively blocks publishing dataset labels to MQTT with **HTTP 409 Conflict** unless a validated adapter (`adapter_mode="explicit_mapped"`) is enabled. The demo runs in **SIMULATED** mode by default.

---

## 📊 Offline Model Metrics & Honesty Note

Measured offline on `gesture_dataset_1000.csv` (see `training_metrics.json`):
- **Validation Accuracy**: 99.33% (150 validation rows)
- **Test Accuracy**: 98.00% (150 held-out test rows)
- **Features**: 19 normalized upper-body geometric keypoints
- **Classes**: 8 balanced classes

> [!IMPORTANT]
> **Synthetic Dataset Limitation**:
> These offline metrics measure class separation on held-out synthetic keypoints generated by kinematic equations. Real webcam inference introduces camera distance variation, perspective tilt, clothing folds, and ambient lighting. For this reason:
> 1. A strict **0.60 confidence threshold** rejects noisy predictions.
> 2. A **1.5s cooldown** prevents rapid-fire toggling of relays.
> 3. The UI transparently displays when predictions are simulated vs. hardware-confirmed.

---

## 🎬 3-Minute Hackathon Demo Script

1. **Startup & Health (30s)**:
   - Point your browser to `http://127.0.0.1:5173` (or `http://127.0.0.1:8000`).
   - Highlight the top status indicators: `API ONLINE`, `SIMULATED MODE`, `MQTT STANDBY`.
   - Click **Model Metrics** in the top bar to show the 99.33% validation / 98.00% test scores and the synthetic transparency note.

2. **Manual Actuation & Safety Gating (60s)**:
   - Scroll to **8-Class Gesture Reference & Manual Actuation**.
   - Click **Trigger Right Hand Up**: watch the Smart Light illuminate with ambient glow and the event log update.
   - Click **Trigger Both Hands Up**: watch the Relay switch ON with contactor indicator.
   - Click **Trigger Arms Crossed**: demonstrate the Emergency Stop immediately snapping the Relay OFF.
   - Switch the test confidence toggle to `0.50 (Reject)` and click any gesture: observe that the backend rejects the action with `reason: confidence_below_0.60`.

3. **Live Webcam Pose Tracking (60s)**:
   - Scroll up to the **Vision Input & Pose Landmarker** card.
   - Click **Start Camera** and allow webcam access.
   - Raise your right hand above your shoulder: observe the skeleton tracking in real-time, the confidence gauge crossing 60%, and the Light turning ON!
   - Extend your right arm horizontally: observe the servo angle animate to 90°.
   - Bring hands together near center chest: observe the servo returning home to 0°.

4. **ESP32 PRD Architecture (30s)**:
   - Click the **ESP32 PRD** button in the header.
   - Show the judges the explicit gating policy: how the 8 upper-body dataset classes are cleanly separated from the 4 ESP32 hand gestures (`open_palm`, `fist`, `point_left`, `point_right`), protecting physical hardware while providing full simulated telemetry.

---

## 📁 Repository Structure

```
├── app.py                         # FastAPI backend with CORS, endpoints & PRD gating
├── dist/                          # Production-compiled React dashboard build
├── ESP32_Gesture_Actuator_PRD_v2.md # Hardware specification & ESP32 pinout
├── generate_gesture_dataset.py    # Synthetic dataset generator
├── gesture_dataset_1000.csv       # 1,000-sample synthetic dataset
├── gesture_model.joblib           # Pre-trained Random Forest model bundle
├── in_process_test.py             # Offline test suite (9 test cases, 100% pass)
├── index.html                     # Frontend entry with MediaPipe CDN scripts
├── package.json                   # Frontend dependencies (React, Vite, Tailwind)
├── README.md                      # Comprehensive documentation & demo guide
├── requirements.txt               # Python dependencies
├── sample_prediction_request.json # Sample 19-feature JSON request
├── src/
│   ├── App.tsx                    # Main dashboard layout & state coordination
│   ├── components/
│   │   ├── CameraView.tsx         # Webcam, MediaPipe skeleton overlay & live HUD
│   │   ├── DeviceCards.tsx        # Light, Relay, Servo visual actuators
│   │   ├── ESP32AdapterModal.tsx  # PRD compatibility modal
│   │   ├── EventTimeline.tsx      # Real-time action log
│   │   ├── GestureReference.tsx   # 8-gesture manual triggers & test presets
│   │   ├── Header.tsx             # Navigation, branding & status indicators
│   │   └── MetricsModal.tsx       # Offline metrics & classification report
│   ├── types.ts                   # TypeScript interfaces
│   └── utils/
│       ├── api.ts                 # Backend REST client
│       └── featureExtractor.ts    # 19 geometric feature extraction from landmarks
├── test_suite.py                  # Live HTTP test suite
├── train_model.py                 # Training script for gesture_model.joblib
└── training_metrics.json          # Offline evaluation metrics
```
