import React from 'react';
import {
  Lightbulb,
  ToggleLeft,
  ToggleRight,
  Compass,
  Cpu,
  ShieldCheck,
  Zap,
  Power,
  RotateCw,
} from 'lucide-react';
import { DeviceState } from '../types';

interface DeviceCardsProps {
  deviceState: DeviceState;
}

export const DeviceCards: React.FC<DeviceCardsProps> = ({ deviceState }) => {
  const isLightOn = deviceState.light === 'ON';
  const isRelayOn = deviceState.relay === 'ON';
  const servoAngle = deviceState.servo_angle || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. LIGHT ACTUATOR */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 backdrop-blur-sm ${
          isLightOn
            ? 'bg-gradient-to-b from-amber-950/30 to-slate-900/70 border-amber-500/50 shadow-xl shadow-amber-500/10'
            : 'bg-slate-900/60 border-slate-800/80 shadow-lg'
        }`}
      >
        {/* Glow ambient circle when light is on */}
        {isLightOn && (
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
        )}

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-xl border transition-colors ${
                isLightOn
                  ? 'bg-amber-400/20 border-amber-400/40 text-amber-300 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 border-slate-700 text-slate-500'
              }`}
            >
              <Lightbulb className={`w-6 h-6 ${isLightOn ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Smart Light
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">GPIO 2 (LED Pin)</p>
            </div>
          </div>

          {/* Mode Pill */}
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-400 border border-slate-700">
            SIMULATED
          </span>
        </div>

        {/* State Display */}
        <div className="mt-6 flex items-baseline justify-between">
          <div>
            <span className="text-xs font-mono uppercase text-slate-400">STATE:</span>
            <div className="text-2xl font-black font-mono tracking-tight flex items-center gap-2">
              <span className={isLightOn ? 'text-amber-300' : 'text-slate-500'}>
                {deviceState.light}
              </span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isLightOn ? 'bg-amber-400 shadow-lg shadow-amber-400/80 animate-ping' : 'bg-slate-600'
                }`}
              />
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400">GESTURE CONTROL</span>
            <p className="text-[11px] font-mono text-slate-300">
              <span className="text-emerald-400">R.Hand Up</span> = ON
              <br />
              <span className="text-slate-400">L.Hand Up</span> = OFF
            </p>
          </div>
        </div>

        {/* Visual Graphic */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <Zap className={`w-3.5 h-3.5 ${isLightOn ? 'text-amber-400' : 'text-slate-600'}`} />
            {isLightOn ? '100% Lumens Output' : 'Circuit Open (Standby)'}
          </span>
          <span className="text-[10px] font-mono text-amber-400/80">No hardware delay</span>
        </div>
      </div>

      {/* 2. RELAY CONTACTOR */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 backdrop-blur-sm ${
          isRelayOn
            ? 'bg-gradient-to-b from-emerald-950/30 to-slate-900/70 border-emerald-500/50 shadow-xl shadow-emerald-500/10'
            : 'bg-slate-900/60 border-slate-800/80 shadow-lg'
        }`}
      >
        {isRelayOn && (
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
        )}

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-xl border transition-colors ${
                isRelayOn
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/80 border-slate-700 text-slate-500'
              }`}
            >
              <Power className={`w-6 h-6 ${isRelayOn ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Main Power Relay
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">GPIO 26 (Active High)</p>
            </div>
          </div>

          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-400 border border-slate-700">
            SIMULATED
          </span>
        </div>

        {/* State Display */}
        <div className="mt-6 flex items-baseline justify-between">
          <div>
            <span className="text-xs font-mono uppercase text-slate-400">RELAY CONTACT:</span>
            <div className="text-2xl font-black font-mono tracking-tight flex items-center gap-2">
              <span className={isRelayOn ? 'text-emerald-400' : 'text-slate-500'}>
                {deviceState.relay}
              </span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isRelayOn ? 'bg-emerald-400 shadow-lg shadow-emerald-400/80' : 'bg-slate-600'
                }`}
              />
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400">GESTURE CONTROL</span>
            <p className="text-[11px] font-mono text-slate-300">
              <span className="text-cyan-400">Both Hands Up</span> = Toggle
              <br />
              <span className="text-rose-400">Arms Crossed</span> = E-Stop
            </p>
          </div>
        </div>

        {/* Visual Graphic */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            E-Stop Safety Enabled
          </span>
          <span className="text-[10px] font-mono text-slate-400">60s Idle Timeout</span>
        </div>
      </div>

      {/* 3. SERVO ACTUATOR */}
      <div className="relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 backdrop-blur-sm bg-gradient-to-b from-blue-950/20 to-slate-900/70 border-blue-500/30 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl border bg-blue-500/20 border-blue-500/40 text-blue-300 shadow-md shadow-blue-500/20">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                PWM Servo Motor
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">GPIO 18 (50 Hz PWM)</p>
            </div>
          </div>

          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-400 border border-slate-700">
            SIMULATED
          </span>
        </div>

        {/* State Display */}
        <div className="mt-6 flex items-baseline justify-between">
          <div>
            <span className="text-xs font-mono uppercase text-slate-400">POSITION:</span>
            <div className="text-2xl font-black font-mono tracking-tight flex items-center gap-2 text-cyan-300">
              <span>{servoAngle}&deg;</span>
              <span className="text-xs font-normal text-slate-400 font-sans">
                {servoAngle === 0 ? '(0° / Left / Home)' : '(90° / Right)'}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400">GESTURE CONTROL</span>
            <p className="text-[11px] font-mono text-slate-300">
              <span className="text-indigo-400">R.Arm Out</span> = 90&deg;
              <br />
              <span className="text-cyan-400">L.Arm Out / Together</span> = 0&deg;
            </p>
          </div>
        </div>

        {/* Visual Graphic: Servo Horn Pointer */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            {/* Visual Arc Gauge */}
            <div className="relative w-8 h-8 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center">
              <div
                className="w-1 h-3.5 bg-cyan-400 rounded-full origin-bottom transition-transform duration-500"
                style={{
                  transform: `rotate(${servoAngle}deg)`,
                  transformOrigin: 'bottom center',
                }}
              />
              <div className="w-2 h-2 rounded-full bg-white z-10" />
            </div>
            <span className="font-mono text-[11px] text-slate-300">
              PWM Duty: {servoAngle === 0 ? '1.0 ms' : '2.0 ms'}
            </span>
          </div>

          <span className="text-[10px] font-mono text-slate-400">Range: 0° – 90°</span>
        </div>
      </div>
    </div>
  );
};
