
import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths } from 'date-fns';
import { SessionRecord } from '../utils/history';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CalendarProps {
  history: SessionRecord[];
}

export const Calendar: React.FC<CalendarProps> = ({ history }) => {
  const today = new Date();
  const days = eachDayOfInterval({
    start: startOfMonth(subMonths(today, 0)),
    end: endOfMonth(today),
  });

  const sessionDays = history.map(s => new Date(s.date));

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Activity</h3>
        <span className="text-xs text-slate-400">{format(today, 'MMMM yyyy')}</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
          <div key={d} className="text-[8px] text-center text-slate-600 font-bold mb-1">{d}</div>
        ))}
        {days.map((day, i) => {
          const hasSession = sessionDays.some(sd => isSameDay(sd, day));
          const isToday = isSameDay(day, today);
          
          return (
            <div
              key={i}
              className={cn(
                "aspect-square rounded-full flex items-center justify-center text-[10px] transition-all",
                hasSession ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold" : "text-slate-700",
                isToday && !hasSession && "border border-slate-700"
              )}
            >
              {format(day, 'd')}
            </div>
          );
        })}
      </div>
    </div>
  );
};
