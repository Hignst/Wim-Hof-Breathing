
import { useState, useEffect } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { SessionScreen } from './components/SessionScreen';
import { getHistory, SessionRecord } from './utils/history';

function App() {
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleStartSession = (config: any) => {
    setActiveSession(config);
  };

  const handleEndSession = () => {
    setActiveSession(null);
    setHistory(getHistory());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500/30">
      <div className="max-w-md mx-auto min-h-screen relative flex flex-col">
        {!activeSession ? (
          <SetupScreen 
            history={history} 
            onStart={handleStartSession} 
          />
        ) : (
          <SessionScreen 
            config={activeSession} 
            onClose={handleEndSession} 
          />
        )}
      </div>

      {/* Decorative background elements */}
      {!activeSession && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        </div>
      )}
    </div>
  );
}

export default App;
