import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  Lightbulb,
  Power,
  Compass,
  MinusCircle,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface GestureReferenceProps {
  onTriggerManual: (gesture: string, confidence?: number) => void;
  activeGesture?: string;
  isProcessing: boolean;
}

export const GESTURE_DEFINITIONS = [
  {
    id: 'idle',
    label: 'Idle Posture',
    gestureKey: 'idle',
    actionText: 'No Action',
    device: 'None',
    description: 'Arms relaxed down at sides. Neutral baseline state.',
    icon: MinusCircle,
    color: 'slate',
    targetState: 'Standby',
  },
  {
    id: 'right_hand_up',
    label: 'Right Hand Up',
    gestureKey: 'right_hand_up',
    actionText: 'Light ON',
    device: 'Light',
    description: 'Right hand raised above shoulder height.',
    icon: Lightbulb,
    color: 'amber',
    targetState: 'Light: ON',
  },
  {
    id: 'left_hand_up',
    label: 'Left Hand Up',
    gestureKey: 'left_hand_up',
    actionText: 'Light OFF',
    device: 'Light',
    description: 'Left hand raised above shoulder height.',
    icon: Lightbulb,
    color: 'slate',
    targetState: 'Light: OFF',
  },
  {
    id: 'both_hands_up',
    label: 'Both Hands Up',
    gestureKey: 'both_hands_up',
    actionText: 'Relay Toggle',
    device: 'Relay',
    description: 'Both hands raised above head/shoulders simultaneously.',
    icon: Power,
    color: 'emerald',
    targetState: 'Relay: Inverted',
  },
  {
    id: 'right_arm_out',
    label: 'Right Arm Out',
    gestureKey: 'right_arm_out',
    actionText: 'Servo to 90°',
    device: 'Servo',
    description: 'Right arm extended horizontally outward from torso.',
    icon: Compass,
    color: 'blue',
    targetState: 'Servo: 90°',
  },
  {
    id: 'left_arm_out',
    label: 'Left Arm Out',
    gestureKey: 'left_arm_out',
    actionText: 'Servo to 0°',
    device: 'Servo',
    description: 'Left arm extended horizontally outward from torso.',
    icon: Compass,
    color: 'cyan',
    targetState: 'Servo: 0°',
  },
  {
    id: 'arms_crossed',
    label: 'Arms Crossed',
    gestureKey: 'arms_crossed',
    actionText: 'Emergency Relay OFF',
    device: 'Relay',
    description: 'Arms crossed in front of chest. Hardware emergency shutdown.',
    icon: ShieldAlert,
    color: 'rose',
    targetState: 'Relay: OFF (E-Stop)',
  },
  {
    id: 'hands_together',
    label: 'Hands Together',
    gestureKey: 'hands_together',
    actionText: 'Servo Home (0°)',
    device: 'Servo',
    description: 'Wrists brought together near center of chest.',
    icon: Compass,
    color: 'indigo',
    targetState: 'Servo: 0° (Home)',
  },
];

export const GestureReference: React.FC<GestureReferenceProps> = ({
  onTriggerManual,
  activeGesture,
  isProcessing,
}) => {
  const [testConfidence, setTestConfidence] = useState<number>(0.95);
  const [showLowConfWarning, setShowLowConfWarning] = useState<boolean>(false);

  return (
    <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 shadow-2xl backdrop-blur-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            8-Class Gesture Reference &amp; Manual Actuation
          </h2>
          <p className="text-xs text-slate-400">
            Click any gesture button below to simulate immediate actuation or test confidence gating
          </p>
        </div>

        {/* Confidence Preset Selector for Testing */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 p-1.5 rounded-xl text-xs">
          <span className="text-[10px] font-mono text-slate-400 pl-1.5">TEST CONF:</span>
          <button
            onClick={() => setTestConfidence(0.95)}
            className={`px-2 py-0.5 rounded-lg font-mono text-[11px] font-semibold transition-colors ${
              testConfidence === 0.95
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            0.95 (Valid)
          </button>
          <button
            onClick={() => setTestConfidence(0.50)}
            className={`px-2 py-0.5 rounded-lg font-mono text-[11px] font-semibold transition-colors ${
              testConfidence === 0.50
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Tests rejection threshold (<0.60)"
          >
            0.50 (Reject)
          </button>
        </div>
      </div>

      {testConfidence < 0.60 && (
        <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            Testing low confidence (0.50): Triggering any gesture will be rejected by backend with{' '}
            <code className="font-mono text-rose-200">reason: confidence_below_0.60</code>.
          </span>
        </div>
      )}

      {/* Grid of 8 Gestures */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {GESTURE_DEFINITIONS.map((g) => {
          const Icon = g.icon;
          const isActive = activeGesture === g.gestureKey;

          return (
            <div
              key={g.id}
              className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 transition-all ${
                isActive
                  ? 'bg-cyan-950/30 border-cyan-500/60 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                  : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{g.label}</h4>
                      <span className="text-[10px] font-mono text-slate-500">{g.gestureKey}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                      g.device === 'Light'
                        ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                        : g.device === 'Relay'
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                        : g.device === 'Servo'
                        ? 'bg-blue-950/40 text-blue-300 border-blue-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {g.actionText}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  {g.description}
                </p>
              </div>

              {/* Action trigger button */}
              <button
                onClick={() => onTriggerManual(g.gestureKey, testConfidence)}
                disabled={isProcessing}
                className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-slate-200 hover:text-white text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-3 h-3 text-cyan-400" />
                <span>Trigger {g.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
