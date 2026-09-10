import React, { useState, useEffect } from 'react';
import { Clock, Zap, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { TimedAccessWindow } from '../../types';

interface VisualCountdownTimerProps {
  timedWindow: TimedAccessWindow | null;
  onExpire?: () => void;
  onLaunchAdjustment?: () => void;
  compact?: boolean;
}

export const VisualCountdownTimer: React.FC<VisualCountdownTimerProps> = ({
  timedWindow,
  onExpire,
  onLaunchAdjustment,
  compact = false,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [totalSeconds, setTotalSeconds] = useState<number>(1);

  useEffect(() => {
    if (!timedWindow || !timedWindow.isActive) {
      setRemainingSeconds(0);
      return;
    }

    const startMs = new Date(timedWindow.startTime).getTime();
    const endMs = new Date(timedWindow.endTime).getTime();
    const totalSec = Math.max(1, Math.floor((endMs - startMs) / 1000));
    setTotalSeconds(totalSec);

    const updateTimer = () => {
      const nowMs = Date.now();
      const diffSec = Math.floor((endMs - nowMs) / 1000);
      if (diffSec <= 0) {
        setRemainingSeconds(0);
        if (onExpire) onExpire();
      } else {
        setRemainingSeconds(diffSec);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [timedWindow, onExpire]);

  if (!timedWindow || !timedWindow.isActive || remainingSeconds <= 0) {
    return null;
  }

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formattedTime = `${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
  const percentRemaining = Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100));

  const isLowTime = remainingSeconds <= 120; // under 2 minutes

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold animate-pulse ${
        isLowTime
          ? 'bg-rose-950/80 text-rose-300 border-rose-600'
          : 'bg-purple-950/80 text-purple-200 border-purple-500'
      }`}>
        <Clock className={`w-4 h-4 ${isLowTime ? 'text-rose-400 animate-spin' : 'text-purple-400'}`} />
        <span>Timed Access: <strong>{formattedTime}</strong></span>
        {onLaunchAdjustment && (
          <button
            onClick={onLaunchAdjustment}
            className="ml-2 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-sans font-bold"
          >
            Adjust Now →
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl border-2 shadow-lg transition-all ${
      isLowTime
        ? 'bg-gradient-to-r from-rose-900/90 to-amber-950/90 border-rose-500 text-white'
        : 'bg-gradient-to-r from-purple-950/95 via-indigo-950/90 to-slate-900 border-purple-500/80 text-white'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl text-white shadow-inner flex items-center justify-center shrink-0 ${
            isLowTime ? 'bg-rose-600 animate-ping' : 'bg-purple-600 animate-pulse'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase tracking-wider font-extrabold text-purple-300">
                Superior Admin Timed Access Active
              </span>
              <span className="bg-purple-800/80 text-purple-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-purple-600">
                {timedWindow.durationMinutes} Min Session
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Authorized by <strong>{timedWindow.grantedBy}</strong> for <strong>{timedWindow.grantedToIssuerName}</strong> ({timedWindow.grantedToIssuerId}).
              Restricted to <strong>{timedWindow.allowedItemIds.length} requested items</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="text-right font-mono bg-black/40 px-3.5 py-2 rounded-xl border border-white/10 shadow-inner">
            <div className="text-[10px] text-purple-300 uppercase tracking-widest font-semibold">Time Remaining</div>
            <div className={`text-xl font-black tracking-wider ${isLowTime ? 'text-rose-400 animate-pulse' : 'text-emerald-300'}`}>
              ⏱️ {formattedTime}
            </div>
          </div>

          {onLaunchAdjustment && (
            <button
              onClick={onLaunchAdjustment}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 shrink-0 hover:scale-105"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Perform Adjustments →</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="mt-3.5 space-y-1">
        <div className="flex justify-between text-[10px] font-mono text-purple-300">
          <span>Session Progress</span>
          <span>{Math.round(percentRemaining)}% remaining</span>
        </div>
        <div className="w-full h-2 bg-slate-900/80 rounded-full overflow-hidden border border-purple-500/30">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isLowTime ? 'bg-rose-500' : 'bg-gradient-to-r from-purple-500 to-emerald-400'
            }`}
            style={{ width: `${percentRemaining}%` }}
          />
        </div>
      </div>
    </div>
  );
};
