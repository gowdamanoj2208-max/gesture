import React, { useEffect, useState } from 'react';
import { X, BarChart3, AlertTriangle, CheckCircle, Database, Layers } from 'lucide-react';
import { fetchMetrics } from '../utils/api';
import { MetricsData } from '../types';

interface MetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MetricsModal: React.FC<MetricsModalProps> = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchMetrics()
        .then((data) => setMetrics(data))
        .catch((err) => console.error('Failed to load metrics:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Random Forest Offline Metrics
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Source: training_metrics.json &bull; Model: gesture_model.joblib
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

        {/* Modal Content */}
        <div className="p-5 space-y-5">
          {/* Integrity Disclaimer */}
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-300">
                Synthetic Keypoint Integrity Notice
              </p>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                The offline scores below represent held-out test splits on synthetic mathematical keypoints, not real-world camera accuracy. In real-world webcam conditions, real people introduce camera perspective distortion, occlusion, and varying lighting.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 font-mono text-xs">
              Loading metrics from server...
            </div>
          ) : metrics ? (
            <>
              {/* Summary Score Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Val Accuracy</span>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                    {(metrics.validation_accuracy * 100).toFixed(2)}%
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">150 samples</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Test Accuracy</span>
                  <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                    {(metrics.test_accuracy * 100).toFixed(2)}%
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">150 held-out rows</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Dataset Rows</span>
                  <div className="text-xl font-bold font-mono text-slate-100 mt-1">
                    {metrics.dataset_rows || 1000}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">700 train / 150 val / 150 test</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Input Vector</span>
                  <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
                    {metrics.feature_count || 19}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">19 geometric features</span>
                </div>
              </div>

              {/* Classification Report per Class */}
              {metrics.test_classification_report && (
                <div>
                  <h4 className="text-xs font-bold text-slate-300 font-mono uppercase mb-2">
                    Held-Out Test Set Performance Breakdown (8 Classes)
                  </h4>
                  <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/50">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px]">
                        <tr>
                          <th className="py-2 px-3">GESTURE CLASS</th>
                          <th className="py-2 px-3">PRECISION</th>
                          <th className="py-2 px-3">RECALL</th>
                          <th className="py-2 px-3">F1-SCORE</th>
                          <th className="py-2 px-3 text-right">SUPPORT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {Object.entries(metrics.test_classification_report).map(([clsName, stats]) => {
                          if (['accuracy', 'macro avg', 'weighted avg'].includes(clsName)) return null;
                          return (
                            <tr key={clsName} className="hover:bg-slate-800/30">
                              <td className="py-2 px-3 font-semibold text-cyan-300">{clsName}</td>
                              <td className="py-2 px-3">{(stats.precision * 100).toFixed(1)}%</td>
                              <td className="py-2 px-3">{(stats.recall * 100).toFixed(1)}%</td>
                              <td className="py-2 px-3 text-emerald-400">{(stats['f1-score'] * 100).toFixed(1)}%</td>
                              <td className="py-2 px-3 text-right text-slate-400">{stats.support}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 19 Required Features List */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 font-mono uppercase mb-2">
                  Ordered Input Features (19 Features)
                </h4>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 flex flex-wrap gap-1.5">
                  {(metrics.features || []).map((f, i) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-cyan-300"
                    >
                      {i + 1}. {f}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-rose-400 font-mono text-xs">
              Unable to load metrics from training_metrics.json.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
