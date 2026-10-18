import React from 'react';
import { Clock, ShieldCheck, CheckCircle2, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { GestureEvent } from '../types';

interface EventTimelineProps {
  events: GestureEvent[];
  onClear?: () => void;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ events, onClear }) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 shadow-2xl backdrop-blur-sm flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Live Action &amp; Gesture Telemetry Timeline
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {events.length} events logged
          </span>
        </div>

        <span className="text-[11px] font-mono text-slate-400">
          Mode: <strong className="text-amber-400">SIMULATED</strong> (Unconfirmed physical)
        </span>
      </div>

      {/* Events Table / List */}
      <div className="overflow-x-auto max-h-[320px] overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/40">
        {events.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">
            No gesture events recorded yet. Trigger a gesture or start the camera to log actions.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-3">TIME</th>
                <th className="py-2.5 px-3">GESTURE</th>
                <th className="py-2.5 px-3">CONFIDENCE</th>
                <th className="py-2.5 px-3">ACTION EXECUTED</th>
                <th className="py-2.5 px-3">DEVICE STATE DELTA</th>
                <th className="py-2.5 px-3 text-right">EXECUTION MODE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {events.map((ev, idx) => {
                const isReset = ev.gesture === 'SYSTEM_RESET';
                const confPercent = Math.round(ev.confidence * 100);

                return (
                  <tr
                    key={ev.id || idx}
                    className="hover:bg-slate-800/30 transition-colors text-slate-300"
                  >
                    {/* Time */}
                    <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {ev.time_str || new Date(ev.ts * 1000).toLocaleTimeString()}
                    </td>

                    {/* Gesture */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          isReset
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {ev.gesture}
                      </span>
                    </td>

                    {/* Confidence */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-bold ${
                          ev.confidence >= 0.60 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {confPercent}%
                      </span>
                    </td>

                    {/* Action Executed */}
                    <td className="py-2.5 px-3 font-sans text-xs">
                      {ev.action?.description || ev.action?.device_action || 'No action'}
                    </td>

                    {/* State Delta */}
                    <td className="py-2.5 px-3 text-[11px] text-slate-400 whitespace-nowrap">
                      {ev.state_after && (
                        <span>
                          Relay: <strong className="text-slate-200">{ev.state_after.relay}</strong> &bull; Light: <strong className="text-slate-200">{ev.state_after.light}</strong> &bull; Servo: <strong className="text-slate-200">{ev.state_after.servo_angle}&deg;</strong>
                        </span>
                      )}
                    </td>

                    {/* Mode */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-300 border border-amber-500/30">
                        SIMULATED
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
