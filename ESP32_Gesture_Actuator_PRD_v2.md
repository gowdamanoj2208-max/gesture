# ESP32 Gesture Actuator - PRD (v2)

## Objective
Create firmware for an ESP32 DevKit that receives gesture events from a vision pipeline over Wi-Fi and MQTT, and drives a relay, a servo and an LED light accordingly. Platform: ESP32, ESP-IDF v5.5.

## Connectivity
The device shall join a Wi-Fi network and connect to an MQTT broker. Wi-Fi SSID, password, broker host and port shall be set in a single configuration file (placeholders: [SSID], [PASSWORD], [BROKER_HOST], 1883). The device shall use MQTT client ID `gestureloop-esp32` and subscribe to the topic `gestureloop/gesture`.

## Gesture Event Format
Each MQTT message is JSON:

    {"gesture":"open_palm","confidence":0.92,"ts":1760000000}

Supported gesture values: open_palm, fist, point_left, point_right. Events with confidence below 0.60 shall be ignored.

## Gesture to Action Mapping
| Gesture | Action |
|---|---|
| open_palm | Relay ON |
| fist | Relay OFF |
| point_left | Servo to 0 degrees |
| point_right | Servo to 90 degrees |

## Requirements
1. Initialize Wi-Fi and connect to the configured network after boot.
2. Connect to the MQTT broker and subscribe to gestureloop/gesture.
3. Parse each incoming JSON gesture event without blocking.
4. Ignore events with confidence below 0.60 or an unknown gesture, or malformed JSON, without changing any output.
5. Execute the mapped relay or servo action within 200 ms of receiving the event.
6. Show device state on an LED: blinking while connecting, solid when connected to the broker.
7. Turn the relay OFF and keep the servo position if no event is received for 60 seconds or the connection is lost, then reconnect automatically. The idle timeout shall be a single configuration constant, default 60 seconds.
8. Keep the main loop responsive; no long blocking delays.
9. A repeated event that matches the current relay state or servo angle shall cause no output change.
10. The firmware shall include FirmGen runtime telemetry (Live Intelligence) so that relay state, servo angle, MQTT connection state and the last accepted gesture can be observed live while the device runs.

## Hardware
Relay input on GPIO 26 (active high). Servo signal on GPIO 18 (50 Hz PWM). Status LED on GPIO 2.

## UART Output
Use UART at 115200 baud for debug logs. Print the Wi-Fi connection result and IP address. Print the MQTT connection result. Print each received gesture and its confidence. Print the action executed with the milliseconds elapsed since the event was received, for example: `ACTION relay=ON latency_ms=12`. Print a line when the idle timeout turns the relay OFF.

## Out of Scope
BLE, OTA updates, authentication, TLS, cloud dashboards and any user interface other than UART, the LED and the Live Intelligence telemetry view (monitoring only).

## Acceptance Criteria
- The ESP32 shall boot, join Wi-Fi and connect to the MQTT broker, with the result printed on UART.
- A published open_palm event shall switch the relay ON and a fist event shall switch it OFF, with matching UART lines.
- point_left and point_right events shall move the servo to 0 and 90 degrees.
- Events below the confidence threshold shall not trigger any action.
- UART latency lines shall show every executed action at or under 200 ms.
- After 60 seconds without events, the relay shall turn OFF, with a matching UART line.
- Live Intelligence shall show the relay state and last gesture changing while events are published.
