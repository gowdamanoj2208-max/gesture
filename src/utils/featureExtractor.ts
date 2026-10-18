/**
 * Extracts 19 numerical features from MediaPipe Pose landmarks
 * matching the exact coordinate and mathematical conventions of
 * generate_gesture_dataset.py and gesture_model.joblib.
 */

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface ExtractedFeatures {
  nose_x: number;
  nose_y: number;
  l_shoulder_x: number;
  l_shoulder_y: number;
  r_shoulder_x: number;
  r_shoulder_y: number;
  l_elbow_x: number;
  l_elbow_y: number;
  r_elbow_x: number;
  r_elbow_y: number;
  l_wrist_x: number;
  l_wrist_y: number;
  r_wrist_x: number;
  r_wrist_y: number;
  l_elbow_angle: number;
  r_elbow_angle: number;
  l_wrist_rel_y: number;
  r_wrist_rel_y: number;
  wrist_distance: number;
}

/**
 * Computes angle at vertex 'b' between vectors (a - b) and (c - b) in degrees
 */
export function calculateJointAngle(
  a: [number, number],
  b: [number, number],
  c: [number, number]
): number {
  const v1: [number, number] = [a[0] - b[0], a[1] - b[1]];
  const v2: [number, number] = [c[0] - b[0], c[1] - b[1]];
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const mag1 = Math.hypot(v1[0], v1[1]);
  const mag2 = Math.hypot(v2[0], v2[1]);
  const denominator = mag1 * mag2 + 1e-9;
  const cosine = Math.min(Math.max(dot / denominator, -1.0), 1.0);
  return Math.round((Math.acos(cosine) * 180.0) / Math.PI * 10) / 10;
}

export function extract19Features(landmarks: Landmark[]): {
  features: ExtractedFeatures | null;
  valid: boolean;
  reason?: string;
} {
  if (!landmarks || landmarks.length < 17) {
    return { features: null, valid: false, reason: "Insufficient pose landmarks detected." };
  }

  // MediaPipe Pose Landmark Indices:
  // 0: nose
  // 11: left_shoulder
  // 12: right_shoulder
  // 13: left_elbow
  // 14: right_elbow
  // 15: left_wrist
  // 16: right_wrist
  const nose = landmarks[0];
  const ls = landmarks[11];
  const rs = landmarks[12];
  const le = landmarks[13];
  const re = landmarks[14];
  const lw = landmarks[15];
  const rw = landmarks[16];

  // Check visibility if available (defaulting to 1 if not present)
  const minVisibility = 0.35;
  const keyPoints = [nose, ls, rs, le, re, lw, rw];
  const invisibleCount = keyPoints.filter(
    (p) => p.visibility !== undefined && p.visibility < minVisibility
  ).length;

  if (invisibleCount > 2) {
    return {
      features: null,
      valid: false,
      reason: "Upper-body keypoints have low visibility. Please face the camera clearly.",
    };
  }

  // Points as [x, y] coordinates
  const pNose: [number, number] = [nose.x, nose.y];
  const pLs: [number, number] = [ls.x, ls.y];
  const pRs: [number, number] = [rs.x, rs.y];
  const pLe: [number, number] = [le.x, le.y];
  const pRe: [number, number] = [re.x, re.y];
  const pLw: [number, number] = [lw.x, lw.y];
  const pRw: [number, number] = [rw.x, rw.y];

  // Calculate shoulder width
  const sw = Math.hypot(pLs[0] - pRs[0], pLs[1] - pRs[1]) || 1e-6;

  // Calculate joint angles at elbows
  const l_elbow_angle = calculateJointAngle(pLs, pLe, pLw);
  const r_elbow_angle = calculateJointAngle(pRs, pRe, pRw);

  // Relative vertical wrist offsets normalized by shoulder width
  const l_wrist_rel_y = Math.round(((pLw[1] - pLs[1]) / sw) * 1000) / 1000;
  const r_wrist_rel_y = Math.round(((pRw[1] - pRs[1]) / sw) * 1000) / 1000;

  // Normalized Euclidean distance between wrists
  const wrist_distance =
    Math.round((Math.hypot(pLw[0] - pRw[0], pLw[1] - pRw[1]) / sw) * 1000) / 1000;

  const features: ExtractedFeatures = {
    nose_x: Math.round(pNose[0] * 10000) / 10000,
    nose_y: Math.round(pNose[1] * 10000) / 10000,
    l_shoulder_x: Math.round(pLs[0] * 10000) / 10000,
    l_shoulder_y: Math.round(pLs[1] * 10000) / 10000,
    r_shoulder_x: Math.round(pRs[0] * 10000) / 10000,
    r_shoulder_y: Math.round(pRs[1] * 10000) / 10000,
    l_elbow_x: Math.round(pLe[0] * 10000) / 10000,
    l_elbow_y: Math.round(pLe[1] * 10000) / 10000,
    r_elbow_x: Math.round(pRe[0] * 10000) / 10000,
    r_elbow_y: Math.round(pRe[1] * 10000) / 10000,
    l_wrist_x: Math.round(pLw[0] * 10000) / 10000,
    l_wrist_y: Math.round(pLw[1] * 10000) / 10000,
    r_wrist_x: Math.round(pRw[0] * 10000) / 10000,
    r_wrist_y: Math.round(pRw[1] * 10000) / 10000,
    l_elbow_angle,
    r_elbow_angle,
    l_wrist_rel_y,
    r_wrist_rel_y,
    wrist_distance,
  };

  return { features, valid: true };
}
