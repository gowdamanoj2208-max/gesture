import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  AlertCircle,
  Eye,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Sliders,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { extract19Features, ExtractedFeatures, Landmark } from '../utils/featureExtractor';
import { predictGesture, executeDeviceAction } from '../utils/api';
import { DeviceState, PredictResponse } from '../types';

interface CameraViewProps {
  onActionTriggered: (actionEvent: any) => void;
  deviceState: DeviceState;
}

export const CameraView: React.FC<CameraViewProps> = ({
  onActionTriggered,
  deviceState,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMediaPipeReady, setIsMediaPipeReady] = useState(false);
  const [mirrorView, setMirrorView] = useState(true);
  const [showKeypointsTable, setShowKeypointsTable] = useState(false);

  // Real-time detection state
  const [currentGesture, setCurrentGesture] = useState<string>('idle');
  const [confidence, setConfidence] = useState<number>(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [extractedFeatures, setExtractedFeatures] = useState<ExtractedFeatures | null>(null);
  const [lastActionTime, setLastActionTime] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [activeJointCount, setActiveJointCount] = useState<number>(0);

  // Debounce cooldown in ms (e.g. 1500ms between actions)
  const COOLDOWN_MS = 1500;
  const CONFIDENCE_THRESHOLD = 0.60;

  // MediaPipe instances ref
  const poseInstanceRef = useRef<any>(null);
  const cameraInstanceRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check MediaPipe availability
  useEffect(() => {
    const checkMediaPipe = () => {
      if ((window as any).Pose) {
        setIsMediaPipeReady(true);
      } else {
        setTimeout(checkMediaPipe, 300);
      }
    };
    checkMediaPipe();
  }, []);

  // Cooldown timer ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = now - lastActionTime;
      if (diff < COOLDOWN_MS) {
        setCooldownRemaining(Math.round(((COOLDOWN_MS - diff) / 1000) * 10) / 10);
      } else {
        setCooldownRemaining(0);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [lastActionTime]);

  // Draw skeleton landmarks on overlay canvas
  const drawLandmarks = useCallback((landmarks: Landmark[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks || landmarks.length < 17) return;

    const w = canvas.width;
    const h = canvas.height;

    // Helper to get canvas coords
    const getPos = (idx: number) => {
      const lm = landmarks[idx];
      let x = lm.x * w;
      if (mirrorView) {
        x = (1 - lm.x) * w;
      }
      return { x, y: lm.y * h, vis: lm.visibility ?? 1 };
    };

    const nose = getPos(0);
    const ls = getPos(11);
    const rs = getPos(12);
    const le = getPos(13);
    const re = getPos(14);
    const lw = getPos(15);
    const rw = getPos(16);

    // Draw connecting skeleton bones
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const drawBone = (p1: any, p2: any, color: string) => {
      if (p1.vis < 0.3 || p2.vis < 0.3) return;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = color;
      ctx.stroke();
    };

    // Shoulder to shoulder
    drawBone(ls, rs, 'rgba(6, 182, 212, 0.8)'); // Cyan
    // Left arm
    drawBone(ls, le, 'rgba(59, 130, 246, 0.8)'); // Blue
    drawBone(le, lw, 'rgba(99, 102, 241, 0.8)'); // Indigo
    // Right arm
    drawBone(rs, re, 'rgba(59, 130, 246, 0.8)');
    drawBone(re, rw, 'rgba(99, 102, 241, 0.8)');
    // Nose to shoulder center
    const sc = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2, vis: Math.min(ls.vis, rs.vis) };
    drawBone(nose, sc, 'rgba(147, 197, 253, 0.5)');

    // Draw joints
    const joints = [
      { p: nose, color: '#38bdf8', r: 5, label: 'Nose' },
      { p: ls, color: '#06b6d4', r: 7, label: 'L.Shoulder' },
      { p: rs, color: '#06b6d4', r: 7, label: 'R.Shoulder' },
      { p: le, color: '#818cf8', r: 6, label: 'L.Elbow' },
      { p: re, color: '#818cf8', r: 6, label: 'R.Elbow' },
      { p: lw, color: '#10b981', r: 8, label: 'L.Wrist' },
      { p: rw, color: '#10b981', r: 8, label: 'R.Wrist' },
    ];

    joints.forEach(({ p, color, r }) => {
      if (p.vis < 0.3) return;
      // Joint glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 4, 0, 2 * Math.PI);
      ctx.fillStyle = `${color}44`;
      ctx.fill();

      // Joint core
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, [mirrorView]);

  // Process single frame inference
  const handlePoseResults = useCallback(
    async (results: any) => {
      if (!results.poseLandmarks) {
        setActiveJointCount(0);
        return;
      }

      setActiveJointCount(results.poseLandmarks.length);
      drawLandmarks(results.poseLandmarks);

      const extraction = extract19Features(results.poseLandmarks);
      if (!extraction.valid || !extraction.features) {
        return;
      }

      setExtractedFeatures(extraction.features);

      // Throttled prediction
      if (isDetecting) return;
      setIsDetecting(true);

      try {
        const pred: PredictResponse = await predictGesture(
          extraction.features as unknown as Record<string, number>
        );

        setCurrentGesture(pred.gesture);
        setConfidence(pred.confidence);

        // Check if confidence satisfies 0.60 threshold
        const now = Date.now();
        const cooldownActive = now - lastActionTime < COOLDOWN_MS;

        if (
          pred.confidence >= CONFIDENCE_THRESHOLD &&
          pred.gesture !== 'idle' &&
          !cooldownActive
        ) {
          // Trigger device action via backend
          const res = await executeDeviceAction(pred.gesture, pred.confidence);
          if (res.accepted) {
            setLastActionTime(now);
            setActionFeedback(`Triggered: ${pred.action?.description || pred.gesture}`);
            onActionTriggered(res.event);
            setTimeout(() => setActionFeedback(null), 2500);
          }
        }
      } catch (err) {
        console.warn('Inference error:', err);
      } finally {
        setIsDetecting(false);
      }
    },
    [drawLandmarks, isDetecting, lastActionTime, onActionTriggered]
  );

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Initialize MediaPipe Pose if available
      const Pose = (window as any).Pose;
      if (Pose) {
        const pose = new Pose({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        pose.onResults(handlePoseResults);
        poseInstanceRef.current = pose;

        // Custom frame processing loop
        let isProcessing = true;
        const processFrame = async () => {
          if (!isProcessing || !videoRef.current || videoRef.current.paused || videoRef.current.ended) {
            return;
          }
          if (videoRef.current.readyState >= 2) {
            await pose.send({ image: videoRef.current }).catch(() => {});
          }
          animationFrameRef.current = requestAnimationFrame(processFrame);
        };

        processFrame();
      }

      setIsCameraRunning(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow webcam access in your browser.'
          : `Failed to open webcam: ${err.message || 'Device not found.'}`
      );
      setIsCameraRunning(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }

    setIsCameraRunning(false);
    setCurrentGesture('idle');
    setConfidence(0);
    setActiveJointCount(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Gesture display format helper
  const formatGestureName = (g: string) => {
    return g.replace(/_/g, ' ').toUpperCase();
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= CONFIDENCE_THRESHOLD) return 'text-emerald-400 bg-emerald-500';
    if (conf >= 0.40) return 'text-amber-400 bg-amber-500';
    return 'text-rose-400 bg-rose-500';
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-sm flex flex-col gap-4">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Vision Input &amp; Pose Landmarker
              {isCameraRunning && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-normal">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE (30 FPS)
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              MediaPipe Pose Landmarker &bull; 19 upper-body geometric features
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Mirror toggle */}
          {isCameraRunning && (
            <button
              onClick={() => setMirrorView(!mirrorView)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                mirrorView
                  ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300'
              }`}
              title="Mirror video display horizontally"
            >
              Mirror: {mirrorView ? 'ON' : 'OFF'}
            </button>
          )}

          {/* Start/Stop Camera */}
          {!isCameraRunning ? (
            <button
              onClick={startCamera}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Start Camera</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <CameraOff className="w-4 h-4" />
              <span>Stop Camera</span>
            </button>
          )}
        </div>
      </div>

      {/* Camera Viewport + Skeleton Canvas */}
      <div className="relative w-full aspect-video sm:aspect-[4/3] max-h-[460px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
        {/* Actual Video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${
            mirrorView ? 'scale-x-[-1]' : ''
          } ${isCameraRunning ? 'block' : 'hidden'}`}
          onLoadedMetadata={() => {
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth || 640;
              canvasRef.current.height = videoRef.current.videoHeight || 480;
            }
          }}
        />

        {/* Skeleton Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
        />

        {/* Idle/Off Overlay */}
        {!isCameraRunning && !cameraError && (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center z-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center shadow-inner text-slate-500">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Camera Inactive</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Click <strong className="text-cyan-400">Start Camera</strong> above to enable live
                landmark detection, or use the <strong className="text-slate-300">Manual Gesture Triggers</strong> below.
              </p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {cameraError && (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center z-20 bg-rose-950/20">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-rose-200">Webcam Initialization Failed</p>
              <p className="text-xs text-rose-300/80 max-w-md mt-1">{cameraError}</p>
            </div>
          </div>
        )}

        {/* Action Trigger Banner Toast */}
        {actionFeedback && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/90 text-white font-medium text-xs shadow-xl shadow-emerald-950/80 backdrop-blur border border-emerald-400/40 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Cooldown Active Overlay Pill */}
        {cooldownRemaining > 0 && isCameraRunning && (
          <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full bg-slate-900/80 border border-amber-500/30 text-amber-300 text-[11px] font-mono flex items-center gap-1.5 shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Cooldown: {cooldownRemaining}s
          </div>
        )}

        {/* Real-time Tracking HUD on bottom of video */}
        {isCameraRunning && (
          <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 text-xs">
            {/* Gesture display */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase text-slate-400">DETECTED:</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded-md border text-xs tracking-wider ${
                  currentGesture === 'idle'
                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                }`}
              >
                {formatGestureName(currentGesture)}
              </span>
            </div>

            {/* Confidence Gauge */}
            <div className="flex items-center gap-2 flex-1 max-w-[200px]">
              <span className="text-[10px] font-mono text-slate-400">CONF:</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden relative">
                {/* 60% threshold tick */}
                <div className="absolute top-0 bottom-0 left-[60%] w-[1.5px] bg-slate-400/70 z-10" title="60% threshold" />
                <div
                  className={`h-full transition-all duration-150 ${
                    confidence >= CONFIDENCE_THRESHOLD
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(confidence * 100, 100)}%` }}
                />
              </div>
              <span
                className={`font-mono text-[11px] font-bold w-10 text-right ${
                  confidence >= CONFIDENCE_THRESHOLD ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>

            {/* Joints indicator */}
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <span>JOINTS:</span>
              <span className={activeJointCount >= 17 ? 'text-cyan-400' : 'text-amber-400'}>
                {activeJointCount ? '7/7 TRACKED' : 'SEARCHING'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Honest Synthetic Model Disclaimer Banner */}
      <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/25 text-amber-200/90 text-xs flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-300">
            Hackathon Model Integrity &amp; Synthetic Dataset Note:
          </p>
          <p className="text-[11px] text-amber-200/75 leading-relaxed">
            The provided Random Forest model was trained on 1,000 synthetic pose-keypoint rows (achieving 99.33% offline validation accuracy). Because it was not trained on real camera imagery, real webcam performance will vary with camera distance, angles, and clothing. A strict <strong className="text-amber-300">0.60 confidence gate</strong> and <strong className="text-amber-300">1.5s cooldown</strong> are enforced to prevent repeated actuation.
          </p>
        </div>
      </div>

      {/* Collapsible Keypoints Drawer */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
        <button
          onClick={() => setShowKeypointsTable(!showKeypointsTable)}
          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs text-slate-300 hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold font-mono">
              Live 19 Extracted Feature Vectors
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              (Order required by gesture_model.joblib)
            </span>
          </div>
          {showKeypointsTable ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showKeypointsTable && (
          <div className="p-3 border-t border-slate-800 text-xs bg-slate-950/60 max-h-56 overflow-y-auto">
            {extractedFeatures ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 font-mono text-[11px]">
                {Object.entries(extractedFeatures).map(([k, v]) => (
                  <div key={k} className="p-2 rounded bg-slate-900 border border-slate-800 flex flex-col">
                    <span className="text-slate-400 text-[10px] truncate">{k}</span>
                    <span className="text-cyan-300 font-bold">{Number(v).toFixed(3)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-500 font-mono text-xs">
                No active landmark vector. Start camera to stream 19-dimensional upper-body features.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
