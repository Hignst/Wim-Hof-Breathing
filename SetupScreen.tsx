
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { SessionRecord } from '../utils/history';
import { format } from 'date-fns';

interface HistoryChartProps {
  history: SessionRecord[];
}

export const HistoryChart: React.FC<HistoryChartProps> = ({ history }) => {
  if (history.length === 0) return null;

  // Take last 7 sessions
  const data = [...history]
    .reverse()
    .slice(-7)
    .map(s => ({
      name: format(new Date(s.date), 'MM/dd'),
      hold: Math.max(...s.holdTimes),
    }));

  return (
    <div className="h-32 w-full mt-4 bg-slate-900/50 border border-slate-800 rounded-2xl p-2">
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2 ml-2">Max Hold (Last 7)</p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 9, fill: '#64748b' }} 
            dy={5}
          />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: '10px' }}
            itemStyle={{ color: '#22d3ee' }}
          />
          <Line 
            type="monotone" 
            dataKey="hold" 
            stroke="#06b6d4" 
            strokeWidth={2} 
            dot={{ r: 3, fill: '#06b6d4' }} 
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
