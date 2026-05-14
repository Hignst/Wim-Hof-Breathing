
export type SessionRecord = {
  id: string;
  date: string; // ISO string
  rounds: number;
  breathsPerRound: number;
  holdTimes: number[]; // seconds
  totalDuration: number; // seconds
};

const STORAGE_KEY = 'wim_hof_history';

export const saveSession = (session: Omit<SessionRecord, 'id'>) => {
  const history = getHistory();
  const newSession = {
    ...session,
    id: crypto.randomUUID(),
  };
  const updatedHistory = [newSession, ...history];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  return updatedHistory;
};

export const getHistory = (): SessionRecord[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

export const calculateStreak = (history: SessionRecord[]): number => {
  if (history.length === 0) return 0;
  
  const uniqueDays = new Set(
    history.map(s => new Date(s.date).toDateString())
  );
  
  const sortedDays = Array.from(uniqueDays)
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const lastSessionDate = new Date(sortedDays[0]);
  lastSessionDate.setHours(0, 0, 0, 0);
  
  const diffInDays = Math.floor((currentDate.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays > 1) return 0;

  for (let i = 0; i < sortedDays.length; i++) {
    const d = new Date(sortedDays[i]);
    d.setHours(0, 0, 0, 0);
    
    const expected = new Date(currentDate);
    expected.setDate(expected.getDate() - i);
    
    if (diffInDays === 1 && i === 0) {
        expected.setDate(expected.getDate());
    }

    if (d.getTime() === expected.getTime()) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};
