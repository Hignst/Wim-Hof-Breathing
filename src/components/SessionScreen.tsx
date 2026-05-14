
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { audio, AUDIO_FREQS } from '../utils/audio';
import { saveSession } from '../utils/history';
import { Trophy, Home, Hand, Infinity as InfinityIcon, ShieldAlert } from 'lucide-react';

const SPEEDS = {
  slow: 6000,
  classic: 4000,
  brisk: 3000,
  fast: 2500,
  dynamic: 5000 // Initial speed for dynamic mode
};

enum STATES {
  WARNING = 'WARNING',
  BREATHING = 'BREATHING',
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
    breathAudio: boolean;
    uiAudio: boolean;
  };
  onClose: () => void;
}

export const SessionScreen: React.FC<SessionScreenProps> = ({ config, onClose }) => {
  const [status, setStatus] = useState<STATES>(STATES.WARNING);
  const [uiRound, setUiRound] = useState(1);
  const [uiBreath, setUiBreath] = useState(0);
  const [uiSeconds, setUiSeconds] = useState(5);
  const [uiPhase, setUiPhase] = useState('Prepare');
  const [uiScale, setUiScale] = useState(1);
  const [uiIsInfinity, setUiIsInfinity] = useState(config.manualMode);
  const [history, setHistory] = useState<number[]>([]);

  const stateRef = useRef({
    status: STATES.WARNING,
    round: 1,
    breath: 0,
    seconds: 5,
    phaseLabel: 'Prepare',
    scale: 1,
    isInfinity: config.manualMode,
    history: [] as number[],
    lastTimestamp: 0,
    phase: -Math.PI / 2,
    holdStart: 0,
    recoveryStart: 0,
    warningStart: performance.now(),
    stepDuration: config.speed === 'dynamic' ? 5000 : SPEEDS[config.speed as keyof typeof SPEEDS],
    expansion: 0.4,
    lastPeakType: null as 'peak' | 'trough' | null,
    halfwayTriggered: false
  });

  const requestRef = useRef<number>(0);
  const circleRef = useRef<SVGCircleElement>(null);
  const warningBarRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);
  const startTimeRef = useRef(Date.now());

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try { wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); }
      catch (err: any) { console.log('Wake Lock Error:', err.message); }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); wakeLockRef.current = null; }
      catch (err: any) { console.log('Wake Lock Release Error:', err.message); }
    }
  }, []);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const startHold = () => {
    const s = stateRef.current;
    s.status = STATES.HOLD;
    s.holdStart = performance.now();
    s.seconds = 0;
    s.phaseLabel = 'Hold';
    s.halfwayTriggered = false;
    setStatus(STATES.HOLD);
    setUiPhase('Hold');
    setUiSeconds(0);
    if (config.uiAudio) audio.playTone(AUDIO_FREQS.hold, 1.5, 0.5);
  };

  const startRecovery = () => {
    const s = stateRef.current;
    const holdDuration = Math.floor((performance.now() - s.holdStart) / 1000);
    s.history.push(holdDuration);
    setHistory([...s.history]);
    s.status = STATES.PRE_RECOVERY;
    s.phaseLabel = 'Inhale Deeply...';
    setStatus(STATES.PRE_RECOVERY);
    setUiPhase('Inhale Deeply...');
    if (config.uiAudio) audio.playLadder();
    setTimeout(() => {
      s.status = STATES.RECOVERY;
      s.recoveryStart = performance.now();
      s.seconds = 15;
      s.phaseLabel = 'Hold (Full)';
      setStatus(STATES.RECOVERY);
      setUiPhase('Hold (Full)');
      setUiSeconds(15);
      if (config.uiAudio) audio.playTone(AUDIO_FREQS.recovery, 1.0, 0.4);
    }, 3000);
  };

  const startPrep = () => {
    const s = stateRef.current;
    s.status = STATES.PRE_ROUND;
    s.seconds = 3;
    s.phaseLabel = 'Prepare...';
    s.recoveryStart = performance.now(); 
    setStatus(STATES.PRE_ROUND);
    setUiPhase('Prepare...');
    setUiSeconds(3);
  };

  const handleFinish = () => {
    const s = stateRef.current;
    s.status = STATES.FINISHED;
    setStatus(STATES.FINISHED);
    const totalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    saveSession({
      date: new Date().toISOString(),
      rounds: config.rounds,
      breathsPerRound: config.breaths,
      holdTimes: s.history,
      totalDuration
    });
  };

  const animate = useCallback((time: number) => {
    const s = stateRef.current;
    if (!s.lastTimestamp) s.lastTimestamp = time;
    const deltaTime = time - s.lastTimestamp;
    s.lastTimestamp = time;

    // --- WARNING ---
    if (s.status === STATES.WARNING) {
      const elapsed = (time - s.warningStart) / 1000;
      if (warningBarRef.current) warningBarRef.current.style.width = `${Math.min(100, (elapsed / 5) * 100)}%`;
      const remaining = Math.max(0, 5 - Math.floor(elapsed));
      if (remaining !== s.seconds) { s.seconds = remaining; setUiSeconds(remaining); }
      if (elapsed >= 5) {
        s.status = STATES.BREATHING;
        s.phase = -Math.PI / 2;
        setStatus(STATES.BREATHING);
        setUiPhase('Inhale');
        if (config.breathAudio) audio.playBreath('inhale', s.stepDuration / 2000);
        if (config.uiAudio) audio.playTone(AUDIO_FREQS.inhale, 1.2, 0.15);
      }
    }

    // --- BREATHING ---
    else if (s.status === STATES.BREATHING) {
      const phaseIncrement = (2 * Math.PI * deltaTime) / s.stepDuration;
      s.phase += phaseIncrement;
      const sinVal = Math.sin(s.phase);
      s.scale = 1.0 + (s.expansion * (sinVal + 1));
      setUiScale(s.scale);

      if (sinVal > 0.98 && s.lastPeakType !== 'peak') {
        s.lastPeakType = 'peak';
        s.breath++;
        setUiBreath(Math.min(s.breath, config.breaths));
        
        // UPCOMING EXHALE DURATION
        const isFinalExhale = s.breath === config.breaths;
        if (isFinalExhale) {
          s.stepDuration = 6000; // Final slow exhale
        } else if (config.speed === 'dynamic') {
          if (s.breath <= 10) s.stepDuration = 5000;
          else if (s.breath <= 20) s.stepDuration = 2500;
          else s.stepDuration = 5000;
        } else {
          s.stepDuration = SPEEDS[config.speed as keyof typeof SPEEDS];
        }

        if (config.breathAudio) audio.playBreath('exhale', s.stepDuration / 2000);
        if (config.uiAudio) {
            audio.playTone(AUDIO_FREQS.exhale, 0.8, 0.15);
            if (s.breath === config.breaths) audio.playWarning();
        }
        setUiPhase('Exhale');
      }

      if (sinVal < -0.98 && s.lastPeakType !== 'trough') {
        s.lastPeakType = 'trough';
        if (s.breath === config.breaths) {
          startHold();
        } else {
          // UPCOMING INHALE SETTINGS
          const isNextFinal = s.breath === config.breaths - 1;
          if (isNextFinal) {
            s.stepDuration = 6000;
            s.expansion = 0.8;
          } else if (config.speed === 'dynamic') {
            const nextB = s.breath + 1;
            if (nextB <= 10) { s.stepDuration = 5000; s.expansion = 0.4; }
            else if (nextB <= 20) { s.stepDuration = 2500; s.expansion = 0.6; }
            else { s.stepDuration = 5000; s.expansion = 0.4; }
          } else {
            s.stepDuration = SPEEDS[config.speed as keyof typeof SPEEDS];
            s.expansion = 0.4;
          }
          
          if (config.breathAudio) audio.playBreath('inhale', s.stepDuration / 2000);
          if (config.uiAudio) audio.playTone(AUDIO_FREQS.inhale, 1.2, 0.15);
          
          if (isNextFinal) setUiPhase('FINAL INHALE');
          else if (s.breath === config.breaths - 3) {
            if (config.uiAudio) audio.playTone(880, 0.5, 0.2); 
            setUiPhase('3 BREATHS LEFT');
          } else setUiPhase('Inhale');
        }
      }
    }

    // --- HOLD ---
    else if (s.status === STATES.HOLD) {
      s.scale += (1.0 - s.scale) * 0.05;
      setUiScale(s.scale);
      const elapsed = (time - s.holdStart) / 1000;
      const rounded = Math.floor(elapsed);
      if (rounded !== s.seconds) {
        s.seconds = rounded;
        setUiSeconds(rounded);
        if (s.isInfinity && rounded > 0 && rounded % 60 === 0) {
          if (config.uiAudio) { audio.playTone(523.25, 0.8, 0.3); setTimeout(() => audio.playTone(659.25, 0.8, 0.3), 150); }
          setUiPhase(`${rounded / 60} MINUTE${rounded / 60 > 1 ? 'S' : ''}`);
          setTimeout(() => setUiPhase('Hold'), 3000);
        }
      }
      if (circleRef.current) {
        const goal = config.holdTimes[s.round - 1];
        if (!s.isInfinity) {
          const offset = 942 - (942 * Math.min(elapsed / goal, 1));
          circleRef.current.style.strokeDashoffset = offset.toString();
          if (!s.halfwayTriggered && rounded === Math.floor(goal / 2)) {
            s.halfwayTriggered = true;
            if (config.uiAudio) { audio.playTone(440, 0.6, 0.2); setTimeout(() => audio.playTone(660, 0.6, 0.2), 150); }
            setUiPhase('HALF WAY');
            setTimeout(() => setUiPhase('Hold'), 2000);
          }
          if (elapsed >= goal) startRecovery();
        } else circleRef.current.style.strokeDashoffset = "942";
      }
    }

    // --- PRE-RECOVERY (The deep intake before hold) ---
    else if (s.status === STATES.PRE_RECOVERY) {
      // Expand to 1.8 (same as final breath) over the 3 second period
      s.scale += (1.8 - s.scale) * 0.03;
      setUiScale(s.scale);
      
      if (circleRef.current) circleRef.current.style.strokeDashoffset = "942";
    }

    // --- RECOVERY ---
    else if (s.status === STATES.RECOVERY) {
      s.scale += (1.5 - s.scale) * 0.05;
      setUiScale(s.scale);
      const elapsed = (time - s.recoveryStart) / 1000;
      const remaining = Math.max(0, 15 - Math.floor(elapsed));
      if (remaining !== s.seconds) { s.seconds = remaining; setUiSeconds(remaining); }
      if (circleRef.current) circleRef.current.style.strokeDashoffset = (942 - (942 * Math.min(elapsed / 15, 1))).toString();
      if (elapsed >= 15) {
        if (config.uiAudio) audio.playTone(AUDIO_FREQS.endRecovery, 0.8, 0.3);
        if (s.round < config.rounds) startPrep();
        else handleFinish();
      }
    }

    // --- PRE-ROUND ---
    else if (s.status === STATES.PRE_ROUND) {
      s.scale += (1.0 - s.scale) * 0.1;
      setUiScale(s.scale);
      if (circleRef.current) circleRef.current.style.strokeDashoffset = "942";
      const elapsed = (time - s.recoveryStart) / 1000;
      const remaining = Math.max(0, 3 - Math.floor(elapsed));
      if (remaining !== s.seconds) { s.seconds = remaining; setUiSeconds(remaining); }
      if (elapsed >= 3) {
        s.round++;
        s.breath = 0;
        s.status = STATES.BREATHING;
        s.phase = -Math.PI / 2;
        s.lastPeakType = null;
        s.stepDuration = config.speed === 'dynamic' ? 5000 : SPEEDS[config.speed as keyof typeof SPEEDS];
        s.expansion = 0.4;
        setUiRound(s.round);
        setUiBreath(0);
        setStatus(STATES.BREATHING);
        setUiPhase('Inhale');
        if (config.breathAudio) audio.playBreath('inhale', s.stepDuration / 2000);
        if (config.uiAudio) audio.playTone(AUDIO_FREQS.inhale, 1.2, 0.15);
      }
    }

    if (s.status !== STATES.FINISHED) requestRef.current = requestAnimationFrame(animate);
  }, [config, startRecovery]);

  useEffect(() => {
    audio.init();
    audio.setVolume(config.volume / 100);
    requestWakeLock();
    requestRef.current = requestAnimationFrame(animate);
    const handleVisibility = () => { if (document.visibilityState === 'visible') requestWakeLock(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      cancelAnimationFrame(requestRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      releaseWakeLock();
    };
  }, [animate, config.volume, requestWakeLock, releaseWakeLock]);

  if (status === STATES.FINISHED) {
    const bestHold = history.length > 0 ? Math.max(...history) : 0;
    const totalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="bg-cyan-500/10 p-4 rounded-full mb-6"><Trophy className="w-12 h-12 text-cyan-400" /></div>
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
        <button onClick={onClose} className="flex items-center gap-2 px-12 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl transition-all active:scale-95 uppercase tracking-widest shadow-xl shadow-cyan-900/20"><Home className="w-5 h-5" />Finish</button>
      </div>
    );
  }

  if (status === STATES.WARNING) {
    return (
      <div className="fixed inset-0 z-50 bg-[#020617] flex flex-col items-center justify-center p-8 text-center">
        <ShieldAlert className="w-12 h-12 text-cyan-500/40 mb-12" />
        <h2 className="text-xs uppercase tracking-[0.5em] text-cyan-400 font-bold mb-8 opacity-60">Safety Protocol</h2>
        <div className="max-w-xs space-y-6 text-slate-400 text-[13px] font-light leading-relaxed mb-12">
          <p>Practice in a safe and comfortable place.</p>
          <p>Never perform breathing exercises while driving, swimming, or operating machinery.</p>
          <p className="text-slate-200 font-medium">If you feel dizzy or unwell — stop immediately and breathe normally.</p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="w-48 h-[1px] bg-white/10 relative overflow-hidden">
            <div ref={warningBarRef} className="absolute inset-y-0 left-0 bg-cyan-500" style={{ width: '0%' }} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-500/60 font-bold">Starting in {uiSeconds}s</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center z-40">
      <div className="absolute top-12 flex gap-16 text-center opacity-40 uppercase tracking-[0.2em] text-[10px] font-bold">
          <div><p className="mb-1">Round</p><p className="text-2xl font-light text-white">{uiRound} / {config.rounds}</p></div>
          <div><p className="mb-1">Breath</p><p className="text-2xl font-light text-white">{uiBreath} / {config.breaths}</p></div>
      </div>
      <div className="relative flex items-center justify-center">
        <svg className={`absolute w-80 h-80 -rotate-90 pointer-events-none transition-opacity duration-500 ${(status === STATES.HOLD || status === STATES.RECOVERY) ? 'opacity-100' : 'opacity-0'}`}>
          <circle ref={circleRef} cx="160" cy="160" r="150" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="942" strokeDashoffset="942" className={`${status === STATES.HOLD ? 'text-red-500' : 'text-cyan-500 opacity-20'}`} />
        </svg>
        <div style={{ transform: `scale(${uiScale})` }} className={`w-56 h-56 rounded-full flex flex-col items-center justify-center relative border-2 ${ (status === STATES.PRE_RECOVERY || (status === STATES.BREATHING && (stateRef.current.breath === config.breaths || (stateRef.current.breath === config.breaths - 1 && stateRef.current.lastPeakType !== 'peak')))) ? "border-red-500 bg-red-500/20 shadow-[0_0_60px_rgba(239,68,68,0.3)] transition-colors duration-1000" : "border-cyan-400/30 bg-cyan-400/5 shadow-[0_0_50px_rgba(34,211,238,0.1)] transition-colors duration-500" }`}>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2 transition-all">{uiPhase}</p>
            {(status === STATES.HOLD || status === STATES.RECOVERY || status === STATES.PRE_ROUND) && (
              <div className="flex flex-col items-center">
                <p className="text-5xl font-extralight text-white font-mono animate-in fade-in duration-300">{formatTimer(uiSeconds)}</p>
                {status === STATES.HOLD && !uiIsInfinity && <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">Goal: {formatTimer(config.holdTimes[uiRound - 1])}</p>}
                {status === STATES.HOLD && uiIsInfinity && <div className="flex items-center gap-1 text-[10px] text-cyan-500 font-bold mt-1 uppercase tracking-widest"><InfinityIcon className="w-2 h-2" /> Infinity</div>}
              </div>
            )}
        </div>
      </div>
      <div className="absolute bottom-16 flex flex-col items-center gap-6 w-full px-8">
        {status === STATES.HOLD && (
          <div className="flex flex-col gap-3 w-full max-w-xs">
             {!uiIsInfinity && <button onClick={() => { setUiIsInfinity(true); stateRef.current.isInfinity = true; }} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"><InfinityIcon className="w-3 h-3" />Switch to Infinity Mode</button>}
             <button onClick={startRecovery} className="w-full py-4 bg-red-600/20 border border-red-500/50 rounded-2xl text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-600/30 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]"><Hand className="w-4 h-4" />I'm Ready (Inhale)</button>
          </div>
        )}
        {status === STATES.RECOVERY && <button onClick={() => { stateRef.current.recoveryStart -= 15000; }} className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all">Skip Recovery</button>}
        <button onClick={() => { if (confirm("Quit session? Progress will not be saved.")) onClose(); }} className="flex items-center gap-2 px-6 py-2 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-red-400/50 hover:text-red-400 transition-all">Quit Session</button>
      </div>
    </div>
  );
};
