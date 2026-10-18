export interface DeviceState {
  relay: 'ON' | 'OFF';
  servo_angle: number;
  light: 'ON' | 'OFF';
  mode: string;
  hardware_confirmed: boolean;
  last_gesture?: string;
  last_updated?: number;
}

export interface ActionInfo {
  device_type: string;
  device_action: string;
  action_value: number;
  description?: string;
}

export interface GestureEvent {
  id: number;
  gesture: string;
  confidence: number;
  ts: number;
  time_str: string;
  action: ActionInfo;
  state_before: Partial<DeviceState>;
  state_after: Partial<DeviceState>;
  mode: string;
  hardware_confirmed: boolean;
  mqtt?: any;
}

export interface HealthResponse {
  ok: boolean;
  model_classes: string[];
  class_count: number;
  features_required: string[];
  feature_count: number;
  device_state: DeviceState;
  mqtt: {
    configured: boolean;
    broker_host: string | null;
    broker_port: number;
    topic: string;
    adapter_enabled: boolean;
    connected: boolean;
    status: string;
  };
  synthetic_data_warning: boolean;
  note: string;
}

export interface PredictResponse {
  gesture: string;
  confidence: number;
  all_probabilities: Record<string, number>;
  action: ActionInfo;
  synthetic_data_warning: boolean;
  note: string;
}

export interface MetricsData {
  dataset_rows: number;
  class_count: number;
  classes: string[];
  feature_count: number;
  features: string[];
  split_counts: {
    train: number;
    val: number;
    test: number;
  };
  validation_accuracy: number;
  test_accuracy: number;
  test_classification_report: Record<string, {
    precision: number;
    recall: number;
    'f1-score': number;
    support: number;
  }>;
  note: string;
}
