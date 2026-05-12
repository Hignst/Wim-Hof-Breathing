
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { audio, AUDIO_FREQS } from '../utils/audio';
import { saveSession } from '../utils/history';
import { Trophy, Home, Hand, Infinity, ShieldAlert } from 'lucide-react';

const SPEEDS = {
  slow: 6000,
  classic: 4000,
  fast: 2500
};

enum STATES {
  WARNING = 'WARNING',
  BREATHING = 'BREATHING',
  EXHALE_BUFFER = 'EXHALE_BUFFER',
  HOLD = 'HOLD',
  PRE_RECOVERY = 'PRE_RECOVERY',
  RECOVERY = 'RECOVERY',
  PRE_ROUND = 'PRE_ROUND',
  FINISHED = 'FINISHED'
}

interface SessionScreenProps {
  config: {
    rounds: number;
    breaths: number;
    speed: string;
    volume: number;
    manualMode: boolean;
    holdTimes: number[];
  };
  onClose: () => void;
}

export const SessionScreen: React.FC<SessionScreenProps> = ({ config, onClose }) => {
  // UI State
  const [status, setStatus] = useState<STATES>(STATES.WARNING);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentBreath, setCurrentBreath] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [scale, setScale] = useState(1);
  const [phaseLabel, setPhaseLabel] = useState('Inhale');
  const [isInfinityMode, setIsInfinityMode] = useState(config.manualMode);
  
  // Refs for logic (to avoid stale closures and unnecessary re-renders)
  const statusRef = useRef<STATES>(STATES.WARNING);
  const isInfinityModeRef = useRef(config.manualMode);
  const roundRef = useRef(1);
  const breathRef = useRef(0);
  const historyRef = useRef<number[]>([]);
  const phaseRef = useRef<number>(-Math.PI / 2);
  const lastPeakTypeRef = useRef<'peak' | 'trough' | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const holdStartRef = useRef<number>(0);
  const recoveryStartRef = useRef<number>(0);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const intervalRef = useRef<any>(null);
  const circleRef = useRef<SVGCircleElement>(null);

  const cycleDuration = SPEEDS[config.speed as keyof typeof SPEEDS];

  // Logic helpers
  const updateStatus = (newStatus: STATES) => {
    statusRef.current = newStatus;
    setStatus(newStatus);
  };

  const handleFinish = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    const totalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    saveSession({
      date: new Date().toISOString(),
      rounds: config.rounds,
      breathsPerRound: config.breaths,
      holdTimes: historyRef.current,
      totalDuration
    });
    updateStatus(STATES.FINISHED);
  }, [config]);

  const startPrep = useCallback(() => {
    roundRef.current += 1;
    setCurrentRound(roundRef.current);
    breathRef.current = 0;
    setCurrentBreath(0);
    
    setSeconds(3);
    setPhaseLabel('Prepare...');
    updateStatus(STATES.PRE_ROUND);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          phaseRef.current = -Math.PI / 2;
          lastPeakTypeRef.current = null;
          updateStatus(STATES.BREATHING);
          setPhaseLabel('Inhale');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const startRecovery = useCallback(() => {
    // Correctly calculate hold duration using performance.now()
    const holdDuration = Math.round((performance.now() - holdStartRef.current) / 1000);
    historyRef.current.push(holdDuration);
    setHistory([...historyRef.current]);
    
    if (intervalRef.current) clearInterval(intervalRef.current);
    updateStatus(STATES.PRE_RECOVERY);
    audio.playLadder();
    setPhaseLabel('Inhale Deeply...');
    
    setTimeout(() => {
      updateStatus(STATES.RECOVERY);
      audio.playTone(AUDIO_FREQS.recovery, 1.0, 0.4);
      setPhaseLabel('Hold (Full)');
      setSeconds(15);
      recoveryStartRef.current = performance.now();
      
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            audio.playTone(AUDIO_FREQS.endRecovery, 0.8, 0.3);
            if (roundRef.current < config.rounds) {
              startPrep();
            } else {
              handleFinish();
            }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }, 3000);
  }, [config.rounds, handleFinish, startPrep]);

  const startHold = useCallback(() => {
    updateStatus(STATES.HOLD);
    audio.playTone(AUDIO_FREQS.hold, 1.5, 0.5);
    setPhaseLabel('Hold');
    holdStartRef.current = performance.now();
    setSeconds(0);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        const next = s + 1;
        // Check auto-advance if not in infinity mode
        if (!isInfinityModeRef.current && next >= config.holdTimes[roundRef.current - 1]) {
          startRecovery();
        }
        return next;
      });
    }, 1000);
  }, [config.holdTimes, startRecovery]);

  // Animation Loop
  const animate = useCallback((time: number) => {
    // If this is the first frame after a status change, initialize lastTime
    if (!lastTimeRef.current) {
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    if (lastTimeRef.current > 0) {
      const deltaTime = time - lastTimeRef.current;
      const currentStatus = statusRef.current;

      if (currentStatus === STATES.BREATHING || currentStatus === STATES.EXHALE_BUFFER) {
        const phaseIncrement = (2 * Math.PI * deltaTime) / cycleDuration;
        phaseRef.current += phaseIncrement;

        const sinVal = Math.sin(phaseRef.current);
        const targetScale = 1.0 + (0.4 * (sinVal + 1));
        
        setScale(prev => prev + (targetScale - prev) * 0.15);

        // Logic for peaks
        if (sinVal > 0.98 && lastPeakTypeRef.current !== 'peak') {
          lastPeakTypeRef.current = 'peak';
          breathRef.current += 1;
          const b = breathRef.current;
          setCurrentBreath(b);

          if (b === config.breaths) {
            audio.playWarning();
            audio.playTone(AUDIO_FREQS.inhale, 1.5, 0.4);
            setPhaseLabel('FINAL BREATH');
          } else {
            audio.playTone(AUDIO_FREQS.inhale, 1.2, 0.3);
            setPhaseLabel('Exhale');
          }

          if (b >= config.breaths) {
            updateStatus(STATES.EXHALE_BUFFER);
          }
        }
        
        if (sinVal < -0.98 && lastPeakTypeRef.current !== 'trough') {
          lastPeakTypeRef.current = 'trough';
          audio.playTone(AUDIO_FREQS.exhale, 0.8, 0.25);
          
          if (currentStatus === STATES.EXHALE_BUFFER) {
            startHold();
          } else {
            setPhaseLabel('Inhale');
          }
        }
      } else if (currentStatus === STATES.HOLD) {
        setScale(prev => prev + (1.0 - prev) * 0.05);
        // Precise progress ring update
        if (circleRef.current && !isInfinityModeRef.current) {
          const elapsed = (time - holdStartRef.current) / 1000;
          const target = config.holdTimes[roundRef.current - 1];
          const offset = 942 - (942 * Math.min(elapsed / target, 1));
          circleRef.current.style.strokeDashoffset = offset.toString();
        } else if (circleRef.current && isInfinityModeRef.current) {
          circleRef.current.style.strokeDashoffset = "0";
        }
      } else if (currentStatus === STATES.RECOVERY) {
        setScale(prev => prev + (1.5 - prev) * 0.05);
        // Precise progress ring update for recovery
        if (circleRef.current) {
          const elapsed = (time - recoveryStartRef.current) / 1000;
          const offset = 942 - (942 * Math.min(elapsed / 15, 1));
          circleRef.current.style.strokeDashoffset = offset.toString();
        }
      } else {
        setScale(prev => prev + (1.0 - prev) * 0.1);
      }
    }
    
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [cycleDuration, config.breaths, startHold, config.holdTimes]);

  useEffect(() => {
    audio.init();
    audio.setVolume(config.volume / 100);
    
    // Start with warning
    setSeconds(5);
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          
          // CRITICAL: Reset all refs for a clean start
          lastTimeRef.current = performance.now();
          phaseRef.current = -Math.PI / 2;
          breathRef.current = 0;
          lastPeakTypeRef.current = null;
          
          setCurrentBreath(0);
          updateStatus(STATES.BREATHING);
          requestRef.current = requestAnimationFrame(animate);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      cancelAnimationFrame(requestRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [animate, config.volume]);

  // Results Screen
  if (status === STATES.WARNING) {
    return (
      <div className="fixed inset-0 z-50 bg-[#020617] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-1000">
        <div className="mb-12 relative">
          <ShieldAlert className="w-12 h-12 text-cyan-500/40" />
          <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full -z-10" />
        </div>
        
        <h2 className="text-xs uppercase tracking-[0.5em] text-cyan-400 font-bold mb-8 opacity-60">Safety Protocol</h2>
        
        <div className="max-w-xs space-y-6 text-slate-400 text-[13px] font-light leading-relaxed mb-12">
          <p className="animate-in slide-in-from-bottom-2 duration-700 delay-150">Practice in a safe and comfortable place.</p>
          <p className="animate-in slide-in-from-bottom-2 duration-700 delay-300">Never perform breathing exercises while driving, swimming, or operating machinery.</p>
          <p className="text-slate-200 font-medium animate-in slide-in-from-bottom-2 duration-700 delay-500">If you feel dizzy or unwell — stop immediately and breathe normally.</p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="w-48 h-[1px] bg-white/5 relative overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-cyan-500/50 transition-all duration-1000 ease-linear"
              style={{ width: `${(seconds / 5) * 100}%` }}
            />
          </div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-500/60 font-bold">
            Preparing Session in {seconds}s
          </span>
        </div>
      </div>
    );
  }

  if (status === STATES.FINISHED) {
    const totalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const bestHold = history.length > 0 ? Math.max(...history) : 0;

    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="bg-cyan-500/10 p-4 rounded-full mb-6">
           <Trophy className="w-12 h-12 text-cyan-400" />
        </div>
        <h2 className="text-4xl font-light mb-2 text-white uppercase tracking-[0.3em]">Session Complete</h2>
        <p className="text-slate-500 text-xs uppercase tracking-widest mb-12">Deep peace achieved</p>
        
        <div className="w-full max-w-xs space-y-4 mb-12">
            <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Total Duration</p>
                <p className="text-3xl font-light text-white">{Math.floor(totalDuration/60)}m {totalDuration%60}s</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                 <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Best Hold</span>
                    <span className="text-xl font-light text-cyan-400">{Math.floor(bestHold/60)}:{(bestHold%60).toString().padStart(2, '0')}</span>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Rounds</span>
                    <span className="text-xl font-light text-white">{config.rounds}</span>
                </div>
            </div>

            <div className="space-y-2 mt-4">
                {history.map((time, i) => (
                    <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 px-2">
                        <span className="text-slate-500 uppercase text-[10px] font-bold tracking-widest">Round {i+1}</span>
                        <span className="font-mono text-cyan-400">{Math.floor(time/60)}:{(time%60).toString().padStart(2, '0')}</span>
                    </div>
                ))}
            </div>
        </div>

        <button 
          onClick={onClose}
          className="flex items-center gap-2 px-12 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl transition-all active:scale-95 uppercase tracking-widest shadow-xl shadow-cyan-900/20"
        >
          <Home className="w-5 h-5" />
          Finish
        </button>
      </div>
    );
  }

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center z-40">
      <div className="absolute top-12 flex gap-16 text-center opacity-40 uppercase tracking-[0.2em] text-[10px] font-bold">
          <div>
              <p className="mb-1">Round</p>
              <p className="text-2xl font-light text-white">{currentRound} / {config.rounds}</p>
          </div>
          <div>
              <p className="mb-1">Breath</p>
              <p className="text-2xl font-light text-white">{Math.min(currentBreath, config.breaths)} / {config.breaths}</p>
          </div>
      </div>

      <div className="relative flex items-center justify-center">
        {(status === STATES.HOLD || status === STATES.RECOVERY) && (
             <svg className="absolute w-80 h-80 -rotate-90 pointer-events-none">
                <circle 
                  ref={circleRef}
                  cx="160" cy="160" r="150" 
                  stroke="currentColor" strokeWidth="4" fill="transparent" 
                  strokeDasharray="942" 
                  strokeDashoffset="942"
                  className={`${status === STATES.HOLD ? 'text-red-500' : 'text-cyan-500 opacity-20'}`}
                />
            </svg>
        )}
       
        <div 
          style={{ transform: `scale(${scale})` }}
          className="w-56 h-56 rounded-full flex flex-col items-center justify-center relative border-2 border-cyan-400/30 bg-cyan-400/5 shadow-[0_0_50px_rgba(34,211,238,0.1)] transition-shadow duration-300"
        >
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2 transition-all">
              {phaseLabel}
            </p>
            {(status === STATES.HOLD || status === STATES.RECOVERY || status === STATES.PRE_ROUND) && (
              <div className="flex flex-col items-center">
                <p className="text-5xl font-extralight text-white font-mono animate-in fade-in duration-300">
                  {formatTimer(seconds)}
                </p>
                {status === STATES.HOLD && !isInfinityMode && (
                  <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">
                    Goal: {formatTimer(config.holdTimes[currentRound - 1])}
                  </p>
                )}
                {status === STATES.HOLD && isInfinityMode && (
                  <div className="flex items-center gap-1 text-[10px] text-cyan-500 font-bold mt-1 uppercase tracking-widest">
                    <Infinity className="w-2 h-2" /> Infinity
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      <div className="absolute bottom-16 flex flex-col items-center gap-6 w-full px-8">
        {status === STATES.HOLD && (
          <div className="flex flex-col gap-3 w-full max-w-xs">
             {!isInfinityMode && (
                <button 
                  onClick={() => {
                    setIsInfinityMode(true);
                    isInfinityModeRef.current = true;
                  }}
                  className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Infinity className="w-3 h-3" />
                  Switch to Infinity Mode
                </button>
             )}
             <button 
              onClick={startRecovery}
              className="w-full py-4 bg-red-600/20 border border-red-500/50 rounded-2xl text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-600/30 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              <Hand className="w-4 h-4" />
              I'm Ready (Inhale)
            </button>
          </div>
        )}

        {status === STATES.RECOVERY && (
            <button 
              onClick={() => {
                  if (intervalRef.current) clearInterval(intervalRef.current);
                  if (roundRef.current < config.rounds) startPrep();
                  else handleFinish();
              }}
              className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all"
            >
              Skip Recovery
            </button>
        )}

        <button 
          onClick={() => {
            if (confirm("Quit session? Progress will not be saved.")) {
              onClose();
            }
          }}
          className="flex items-center gap-2 px-6 py-2 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-red-400/50 hover:text-red-400 transition-all"
        >
          Quit Session
        </button>
      </div>
    </div>
  );
};
