import React from 'react';
import { X, ShieldAlert, Cpu, Radio, AlertOctagon, CheckCircle2, ArrowRight } from 'lucide-react';

interface ESP32AdapterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ESP32AdapterModal: React.FC<ESP32AdapterModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                ESP32 Hardware PRD &amp; Vocabulary Compatibility
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                PRD v2: gestureloop/gesture &bull; Client ID: gestureloop-esp32
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Critical Rule Banner */}
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-300">
                Rule: Vocabulary Discrepancy Gate
              </p>
              <p className="text-[11px] text-rose-200/80 leading-relaxed">
                The supplied 1,000-sample dataset trains on <strong>8 upper-body classes</strong> (e.g. <code className="text-rose-100">right_hand_up</code>, <code className="text-rose-100">both_hands_up</code>), while the ESP32 PRD expects <strong>4 hand gestures</strong> (<code className="text-rose-100">open_palm</code>, <code className="text-rose-100">fist</code>, <code className="text-rose-100">point_left</code>, <code className="text-rose-100">point_right</code>). Sending raw dataset labels to the PRD topic is intentionally blocked to protect hardware.
              </p>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
            <div className="p-2.5 bg-slate-900 border-b border-slate-800 font-mono font-bold text-slate-300 flex items-center justify-between text-[11px]">
              <span>Dataset Model (8 Classes)</span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <span>ESP32 Firmware PRD (4 Gestures)</span>
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
              <div className="space-y-1 text-slate-300">
                <p className="text-slate-400 font-bold mb-1">DATASET ACTION MAPPINGS:</p>
                <p>&bull; right_hand_up &rarr; Light ON</p>
                <p>&bull; left_hand_up &rarr; Light OFF</p>
                <p>&bull; both_hands_up &rarr; Relay Toggle</p>
                <p>&bull; right_arm_out &rarr; Servo 90&deg;</p>
                <p>&bull; left_arm_out &rarr; Servo 0&deg;</p>
                <p>&bull; arms_crossed &rarr; Relay E-Stop OFF</p>
                <p>&bull; hands_together &rarr; Servo Home 0&deg;</p>
                <p>&bull; idle &rarr; No Action</p>
              </div>
              <div className="space-y-1 text-cyan-300">
                <p className="text-slate-400 font-bold mb-1">PRD FIRMWARE EXPECTS:</p>
                <p>&bull; open_palm &rarr; Relay ON</p>
                <p>&bull; fist &rarr; Relay OFF</p>
                <p>&bull; point_left &rarr; Servo 0&deg;</p>
                <p>&bull; point_right &rarr; Servo 90&deg;</p>
                <p className="text-slate-500 pt-2 text-[10px]">
                  Topic: gestureloop/gesture<br />
                  Payload: &#123;"gesture": "open_palm", "confidence": 0.92, "ts": 176...&#125;
                </p>
              </div>
            </div>
          </div>

          {/* Hardware Pinout Specs */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <p className="font-bold text-slate-200 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              ESP32 DevKit GPIO Pinout (PRD Spec)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-[11px]">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 text-[10px]">RELAY</span>
                <p className="text-emerald-400 font-bold">GPIO 26</p>
                <span className="text-[9px] text-slate-400">Active High</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 text-[10px]">SERVO</span>
                <p className="text-blue-400 font-bold">GPIO 18</p>
                <span className="text-[9px] text-slate-400">50 Hz PWM</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 text-[10px]">STATUS LED</span>
                <p className="text-amber-400 font-bold">GPIO 2</p>
                <span className="text-[9px] text-slate-400">Blink/Solid</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 text-[10px]">UART</span>
                <p className="text-indigo-400 font-bold">115200</p>
                <span className="text-[9px] text-slate-400">Debug Telemetry</span>
              </div>
            </div>
          </div>

          {/* Safety State */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-[11px] space-y-1">
            <p className="text-slate-200 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Adapter Safety Configuration
            </p>
            <p>
              In this hackathon MVP, device actuation is run safely in <strong className="text-amber-400">SIMULATED</strong> mode. If physical hardware is attached later, an explicit adapter flag <code className="font-mono text-slate-300">HARDWARE_ADAPTER_ENABLED=true</code> can be set in <code className="font-mono text-slate-300">.env</code> to route translated events to your MQTT broker.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
