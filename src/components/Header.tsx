import React from 'react';
import { Activity, RotateCcw, BarChart2, ShieldAlert, Cpu, Radio, Volume2, VolumeX } from 'lucide-react';
import { HealthResponse } from '../types';

interface HeaderProps {
  health: HealthResponse | null;
  backendConnected: boolean;
  onReset: () => void;
  onOpenMetrics: () => void;
  onOpenPRD: () => void;
  audioFeedback: boolean;
  onToggleAudio: () => void;
  isResetting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  backendConnected,
  onReset,
  onOpenMetrics,
  onOpenPRD,
  audioFeedback,
  onToggleAudio,
  isResetting,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/10">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                GestureLink AI
              </h1>
              <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded-full uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                MVP v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              AI-Powered Gesture-Controlled Devices &bull; Edge CV &amp; Actuators
            </p>
          </div>
        </div>

        {/* Center Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          {/* Backend Connection */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              backendConnected
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'
              }`}
            />
            <span className="font-mono text-[11px]">
              {backendConnected ? 'API ONLINE' : 'API DISCONNECTED'}
            </span>
          </div>

          {/* Device Mode */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-amber-950/30 text-amber-300 border-amber-500/30" title="Simulated device state. Physical actions require validated PRD adapter & broker.">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-[11px] font-semibold">SIMULATED MODE</span>
          </div>

          {/* MQTT Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-slate-900/60 text-slate-400 border-slate-700/50">
            <Radio className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[11px]">
              MQTT: {health?.mqtt?.connected ? 'CONNECTED' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Audio toggle */}
          <button
            onClick={onToggleAudio}
            className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
              audioFeedback
                ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/40'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={audioFeedback ? 'Sound Feedback: ON' : 'Sound Feedback: OFF'}
          >
            {audioFeedback ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* PRD Adapter info button */}
          <button
            onClick={onOpenPRD}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/30 text-indigo-300 hover:bg-indigo-900/40 text-xs font-medium transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">ESP32 PRD</span>
          </button>

          {/* Offline Metrics button */}
          <button
            onClick={onOpenMetrics}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Model Metrics</span>
          </button>

          {/* Reset Demo button */}
          <button
            onClick={onReset}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-md shadow-rose-900/30 text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>
    </header>
  );
};
