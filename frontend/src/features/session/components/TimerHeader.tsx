import React from 'react';

export interface TimerData {
  elapsed: number;
  total: number;
}

interface TimerHeaderProps {
  timer?: TimerData;
  speed: number;
  onSpeed: (s: number) => void;
  isStarted?: boolean;
  isPaused?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  showControls?: boolean;
  onToggleControls?: () => void;
}

export const TimerHeader: React.FC<TimerHeaderProps> = ({ timer, speed, onSpeed, isStarted, isPaused, onStart, onPause, onEnd, showControls = false, onToggleControls }) => {
  const mmss = (sec?: number) => {
    if (sec === undefined) return '--:--';
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="px-4 py-2 bg-gradient-to-r from-sky-900/20 via-indigo-900/15 to-emerald-900/20 backdrop-blur border-b border-white/10 flex items-center justify-between">
      {/* Session Timer with Stage Progress (Watchface Style) */}
      <div className="flex items-center gap-6">
        {/* Main Timer */}
        <div className="flex items-center gap-3">
          <div className="text-white/60 text-xs">Session</div>
          <div className="flex items-end gap-2">
            <div className="text-2xl font-mono text-white/90 tracking-wider">{mmss(timer?.elapsed as any)}</div>
            <div className="text-white/50 text-xs">/ {mmss(timer?.total as any)}</div>
          </div>
        </div>
        
        {/* Session Status Indicator */}
        {timer && timer.total > 0 ? (
          /* Active Session - Show Current Stage */
          <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-full border border-blue-400/40 shadow-lg">
            <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-blue-300 flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-bold">1</span>
            </div>
            <div>
              <div className="text-blue-100 text-base font-semibold">Issue Decision</div>
              <div className="text-blue-200/70 text-xs">Stage 1 of 8 • Active</div>
            </div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse ml-2"></div>
          </div>
        ) : (
          /* Pre-Session - Waiting to Start */
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-500/10 rounded-full border border-slate-500/20">
            <div className="w-8 h-8 rounded-full bg-slate-500/30 border border-slate-400/30 flex items-center justify-center">
              <span className="text-slate-300 text-sm">⏳</span>
            </div>
            <div>
              <div className="text-slate-200 text-base font-medium">Pre-Session</div>
              <div className="text-slate-300/70 text-xs">Waiting to start</div>
            </div>
          </div>
        )}
        
        {/* Pause/Resume Controls */}
        <div className="flex items-center gap-2">
          <button 
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-colors"
            title="Pause session"
          >
            <span className="text-white/70">⏸</span>
          </button>
          <button 
            className="w-8 h-8 rounded-full bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 flex items-center justify-center transition-colors"
            title="Resume session"
          >
            <span className="text-green-300">▶</span>
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-white/50">
          <span>Speed</span>
          <div className="flex rounded overflow-hidden border border-white/10">
            {[1,2,3].map((s) => (
              <button key={s} onClick={() => onSpeed(s)} className={`px-2 py-[2px] text-[11px] ${speed===s?'bg-white/15 text-white':'text-white/60 hover:bg-white/10'}`}>{s}x</button>
            ))}
          </div>
        </div>
        {showControls ? (
          <div className="flex items-center gap-2">
            {!isStarted ? (
              <button onClick={onStart} className="px-3 py-1.5 text-xs rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30">Start</button>
            ) : (
              <button onClick={onPause} className="px-3 py-1.5 text-xs rounded bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30">{isPaused ? 'Resume' : 'Pause'}</button>
            )}
            <button onClick={onEnd} className="px-3 py-1.5 text-xs rounded bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30">End</button>
          </div>
        ) : (
          <button onClick={onToggleControls} className="px-2 py-1 text-[11px] text-white/50 hover:text-white/80">More…</button>
        )}
      </div>
    </div>
  );
};


