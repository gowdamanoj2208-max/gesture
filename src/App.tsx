import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { CameraView } from './components/CameraView';
import { DeviceCards } from './components/DeviceCards';
import { GestureReference } from './components/GestureReference';
import { EventTimeline } from './components/EventTimeline';
import { MetricsModal } from './components/MetricsModal';
import { ESP32AdapterModal } from './components/ESP32AdapterModal';
import { fetchHealth, fetchDevices, fetchEvents, executeDeviceAction, resetDemoState } from './utils/api';
import { DeviceState, GestureEvent, HealthResponse } from './types';

// Audio feedback synthesizer using Web Audio API
const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio context may be restricted by autoplay policies
  }
};

export const App: React.FC = () => {
  const [deviceState, setDeviceState] = useState<DeviceState>({
    relay: 'OFF',
    servo_angle: 0,
    light: 'OFF',
    mode: 'SIMULATED',
    hardware_confirmed: false,
  });

  const [events, setEvents] = useState<GestureEvent[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [activeGesture, setActiveGesture] = useState<string>('idle');
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [audioFeedback, setAudioFeedback] = useState<boolean>(true);

  // Modals
  const [isMetricsOpen, setIsMetricsOpen] = useState<boolean>(false);
  const [isPRDOpen, setIsPRDOpen] = useState<boolean>(false);

  // Sound triggers
  const playActionSound = useCallback(
    (actionType: string) => {
      if (!audioFeedback) return;
      if (actionType === 'light') {
        playTone(660, 0.15, 'triangle');
      } else if (actionType === 'relay') {
        playTone(440, 0.18, 'square');
      } else if (actionType === 'servo') {
        playTone(880, 0.2, 'sine');
      } else {
        playTone(520, 0.1, 'sine');
      }
    },
    [audioFeedback]
  );

  // Fetch initial state & start polling
  const syncBackend = useCallback(async () => {
    try {
      const h = await fetchHealth();
      setHealth(h);
      setBackendConnected(true);
      if (h.device_state) {
        setDeviceState(h.device_state);
      }
      const evs = await fetchEvents();
      setEvents(evs);
    } catch (err) {
      setBackendConnected(false);
    }
  }, []);

  useEffect(() => {
    syncBackend();
    const interval = setInterval(syncBackend, 3500);
    return () => clearInterval(interval);
  }, [syncBackend]);

  // Handle camera-triggered action
  const handleActionTriggered = useCallback(
    (actionEvent: GestureEvent) => {
      if (actionEvent && actionEvent.state_after) {
        setDeviceState((prev) => ({
          ...prev,
          ...actionEvent.state_after,
        }));
      }
      if (actionEvent) {
        setActiveGesture(actionEvent.gesture);
        setEvents((prev) => [actionEvent, ...prev.slice(0, 99)]);
        playActionSound(actionEvent.action?.device_type || 'none');
      }
    },
    [playActionSound]
  );

  // Handle manual trigger from gesture panel
  const handleTriggerManual = async (gesture: string, confidence: number = 0.95) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    setActiveGesture(gesture);

    try {
      const res = await executeDeviceAction(gesture, confidence);
      if (res.accepted) {
        setDeviceState(res.state);
        if (res.event) {
          setEvents((prev) => [res.event!, ...prev.slice(0, 99)]);
        }
        playActionSound(res.action?.device_type || 'none');
      } else {
        // Rejected due to confidence or rule
        playTone(220, 0.25, 'sawtooth');
      }
    } catch (err: any) {
      console.error('Manual action error:', err);
    } finally {
      setIsProcessingAction(false);
      setTimeout(() => setActiveGesture('idle'), 2000);
    }
  };

  // Handle Reset Demo
  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await resetDemoState();
      setDeviceState(res.state);
      playTone(330, 0.2, 'sine');
      const updatedEvents = await fetchEvents();
      setEvents(updatedEvents);
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070a12] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation & Status Bar */}
      <Header
        health={health}
        backendConnected={backendConnected}
        onReset={handleReset}
        onOpenMetrics={() => setIsMetricsOpen(true)}
        onOpenPRD={() => setIsPRDOpen(true)}
        audioFeedback={audioFeedback}
        onToggleAudio={() => setAudioFeedback(!audioFeedback)}
        isResetting={isResetting}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Device State Cards */}
        <section aria-label="Device Actuators">
          <DeviceCards deviceState={deviceState} />
        </section>

        {/* Live Camera & Real-Time Computer Vision */}
        <section aria-label="Vision Input">
          <CameraView
            onActionTriggered={handleActionTriggered}
            deviceState={deviceState}
          />
        </section>

        {/* 8-Class Gesture Reference & Manual Actuators */}
        <section aria-label="Gesture Controls">
          <GestureReference
            onTriggerManual={handleTriggerManual}
            activeGesture={activeGesture}
            isProcessing={isProcessingAction}
          />
        </section>

        {/* Action & Gesture Telemetry Timeline */}
        <section aria-label="Telemetry Events">
          <EventTimeline events={events} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-4 text-center text-xs text-slate-500 font-mono">
        <p>
          GestureLink AI &bull; AI-Powered Gesture-Controlled Devices &bull; Hackathon MVP
        </p>
        <p className="text-[10px] text-slate-600 mt-1">
          Built with React 18, Vite, TypeScript, Tailwind CSS, MediaPipe Pose &amp; FastAPI (Scikit-Learn Random Forest)
        </p>
      </footer>

      {/* Modals */}
      <MetricsModal isOpen={isMetricsOpen} onClose={() => setIsMetricsOpen(false)} />
      <ESP32AdapterModal isOpen={isPRDOpen} onClose={() => setIsPRDOpen(false)} />
    </div>
  );
};

export default App;
