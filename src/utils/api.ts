import { DeviceState, GestureEvent, HealthResponse, MetricsData, PredictResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) {
    throw new Error(`Health check failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchMetrics(): Promise<MetricsData> {
  const res = await fetch(`${API_BASE}/api/metrics`);
  if (!res.ok) {
    throw new Error(`Metrics fetch failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchDevices(): Promise<DeviceState> {
  const res = await fetch(`${API_BASE}/api/devices`);
  if (!res.ok) {
    throw new Error(`Devices fetch failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchEvents(): Promise<GestureEvent[]> {
  const res = await fetch(`${API_BASE}/api/events`);
  if (!res.ok) {
    throw new Error(`Events fetch failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function predictGesture(features: Record<string, number>): Promise<PredictResponse> {
  const res = await fetch(`${API_BASE}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ features }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `Prediction failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function executeDeviceAction(
  gesture: string,
  confidence: number,
  publishMqtt = false,
  adapterMode?: string
): Promise<{ accepted: boolean; state: DeviceState; event?: GestureEvent; action?: any; reason?: string; mqtt?: any }> {
  const res = await fetch(`${API_BASE}/api/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gesture,
      confidence,
      publish_mqtt: publishMqtt,
      adapter_mode: adapterMode,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || `Action execution failed: HTTP ${res.status}`);
  }
  return data;
}

export async function resetDemoState(): Promise<{ message: string; state: DeviceState }> {
  const res = await fetch(`${API_BASE}/api/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Reset failed: HTTP ${res.status}`);
  }
  return res.json();
}
