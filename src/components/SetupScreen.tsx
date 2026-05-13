
import React, { useState, useEffect } from 'react';
import { Calendar } from './Calendar';
import { HistoryChart } from './HistoryChart';
import { SessionRecord, calculateStreak } from '../utils/history';
import { Flame, Clock, Trophy, ChevronRight } from 'lucide-react';

interface SetupScreenProps {
  history: SessionRecord[];
  onStart: (config: any) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ history, onStart }) => {
  // Load initial state from LocalStorage or use defaults
  const [rounds, setRounds] = useState(() => {
    const saved = localStorage.getItem('wim_hof_rounds');
    return saved ? parseInt(saved) : 3;
  });
  const [breaths, setBreaths] = useState(() => {
    const saved = localStorage.getItem('wim_hof_breaths');
    return saved ? parseInt(saved) : 30;
  });
  const [speed, setSpeed] = useState(() => {
    return localStorage.getItem('wim_hof_speed') || 'classic';
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('wim_hof_volume');
    return saved ? parseInt(saved) : 60;
  });
  const [manualMode, setManualMode] = useState(() => {
    return localStorage.getItem('wim_hof_manual') === 'true';
  });
  const [breathAudio, setBreathAudio] = useState(() => {
    const saved = localStorage.getItem('wim_hof_breath_audio');
    return saved === null ? false : saved === 'true'; // Default to false
  });
  const [uiAudio, setUiAudio] = useState(() => {
    const saved = localStorage.getItem('wim_hof_ui_audio');
    return saved === null ? true : saved === 'true';
  });
  const [holdTimes, setHoldTimes] = useState<number[]>(() => {
    const saved = localStorage.getItem('wim_hof_hold_times');
    return saved ? JSON.parse(saved) : [90, 120, 150];
  });

  // Save settings whenever they change
  useEffect(() => {
    localStorage.setItem('wim_hof_rounds', rounds.toString());
    localStorage.setItem('wim_hof_breaths', breaths.toString());
    localStorage.setItem('wim_hof_speed', speed);
    localStorage.setItem('wim_hof_volume', volume.toString());
    localStorage.setItem('wim_hof_manual', manualMode.toString());
    localStorage.setItem('wim_hof_breath_audio', breathAudio.toString());
    localStorage.setItem('wim_hof_ui_audio', uiAudio.toString());
    localStorage.setItem('wim_hof_hold_times', JSON.stringify(holdTimes));
  }, [rounds, breaths, speed, volume, manualMode, holdTimes, breathAudio, uiAudio]);

  // Adjust hold times array size when rounds change, but keep existing values if possible
  useEffect(() => {
    setHoldTimes(prev => {
      if (prev.length === rounds) return prev;
      const newTimes = [...prev];
      if (newTimes.length < rounds) {
        for (let i = newTimes.length; i < rounds; i++) {
          newTimes.push((i + 1) * 30 + 60);
        }
      } else {
        return newTimes.slice(0, rounds);
      }
      return newTimes;
    });
  }, [rounds]);

  const streak = calculateStreak(history);
  const totalTime = history.reduce((acc, s) => acc + s.totalDuration, 0);
  const bestHold = history.length > 0 ? Math.max(...history.flatMap(s => s.holdTimes)) : 0;

  const SPEEDS = { slow: 6000, classic: 4000, fast: 2500 };
  // Accurate calculation including: 
  // 5s warning + rounds * (breathing + 4s final breath + 3s pre-recovery + 15s recovery + 3s prep)
  const estimatedSeconds = 5 + 
                           (rounds * (breaths * SPEEDS[speed as keyof typeof SPEEDS] / 1000 + 4 + 3 + 15 + 3)) - 3 + // subtract last prep
                           (manualMode ? 0 : holdTimes.reduce((a, b) => a + b, 0));

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const handleHoldTimeChange = (index: number, val: string) => {
    const newTimes = [...holdTimes];
    newTimes[index] = parseInt(val) || 0;
    setHoldTimes(newTimes);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 pb-20 p-6 animate-in fade-in duration-700">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-4xl font-extralight tracking-tighter text-white">Wim Hof</h1>
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-400 font-bold ml-1">Breathing</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 bg-cyan-950/30 border border-cyan-500/20 px-3 py-1.5 rounded-full">
             <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
             <span className="text-sm font-bold text-white">{streak} day streak</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1 text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Total Time</span>
          </div>
          <div className="text-xl font-light text-white">{formatTime(totalTime)}</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1 text-slate-500">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Best Hold</span>
          </div>
          <div className="text-xl font-light text-white">{Math.floor(bestHold/60)}:{(bestHold%60).toString().padStart(2, '0')}</div>
        </div>
      </div>

      <Calendar history={history} />
      <HistoryChart history={history} />

      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold">Session Config</h2>
          {!manualMode && (
            <div className="bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              <span className="text-[9px] text-cyan-400 uppercase tracking-widest font-bold">Est: </span>
              <span className="text-[10px] font-mono text-white">{Math.floor(estimatedSeconds/60)}:{Math.round(estimatedSeconds%60).toString().padStart(2, '0')}</span>
            </div>
          )}
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
             <label className="text-xs uppercase tracking-widest text-slate-500 font-bold">Rounds</label>
             <span className="text-sm text-cyan-400 font-mono">{rounds}</span>
          </div>
          <input 
            type="range" min="1" max="10" value={rounds} 
            onChange={(e) => setRounds(parseInt(e.target.value))}
            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
             <label className="text-xs uppercase tracking-widest text-slate-500 font-bold">Breaths per Round</label>
             <span className="text-sm text-cyan-400 font-mono">{breaths}</span>
          </div>
          <input 
            type="range" min="5" max="60" step="5" value={breaths} 
            onChange={(e) => setBreaths(parseInt(e.target.value))}
            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Speed</label>
            <select 
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              className="w-full bg-slate-800 border-none rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-cyan-500"
            >
            <option value="slow">Slow (6.0s)</option>
            <option value="classic">Classic (4.0s)</option>
            <option value="fast">Fast (2.5s)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Volume</label>
            <div className="flex items-center gap-2 h-11 bg-slate-800 rounded-xl px-3">
               <input 
                type="range" min="0" max="100" value={volume} 
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-slate-700 rounded-lg appearance-none"
              />
            </div>
          </div>
        </div>

        {!manualMode && (
          <div>
            <label className="block text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">Hold Goals (seconds)</label>
            <div className="grid grid-cols-3 gap-2">
              {holdTimes.map((time, i) => (
                <div key={i} className="space-y-1">
                  <span className="text-[9px] text-slate-600 block text-center uppercase">R{i+1}</span>
                  <input 
                    type="number" 
                    value={time} 
                    onChange={(e) => handleHoldTimeChange(i, e.target.value)}
                    className="w-full bg-slate-800 border-none rounded-lg p-2 text-center text-sm font-mono text-cyan-400"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-2xl border border-slate-800">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-300">Manual Hold Mode</span>
              <span className="text-[10px] text-slate-500">Stop hold whenever you want</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" checked={manualMode} 
                onChange={(e) => setManualMode(e.target.checked)} 
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-2xl border border-slate-800">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-300">Realistic Breath Sounds</span>
              <span className="text-[10px] text-slate-500">Immersive air-flow noise</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" checked={breathAudio} 
                onChange={(e) => setBreathAudio(e.target.checked)} 
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-2xl border border-slate-800">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-300">UI Tones & Chimes</span>
              <span className="text-[10px] text-slate-500">Signals for milestones</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" checked={uiAudio} 
                onChange={(e) => setUiAudio(e.target.checked)} 
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>
        </div>

        <button 
          onClick={() => onStart({ rounds, breaths, speed, volume, manualMode, holdTimes, breathAudio, uiAudio })}
          className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 flex items-center justify-center gap-2 group"
        >
          START SESSION
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
