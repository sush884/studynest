import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Trophy,
  Award,
  Clock,
  Flame,
  Sparkles,
  Zap,
  Medal,
} from 'lucide-react';

interface Props {
  groupId: string;
}

export const GroupLeaderboardTab: React.FC<Props> = ({ groupId }) => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getGroupLeaderboard(groupId, timeframe);
      setLeaderboard(data);
    } catch (err: any) {
      console.error('Failed to load leaderboard:', err);
      setError(err.message || 'Failed to load group leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [groupId, timeframe]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        <Sparkles className="w-8 h-8 text-pink-500 animate-spin mx-auto mb-2" />
        <p>Ranking group members based on real activity...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none">
      {/* Header & Filter */}
      <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-pink-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="text-xs font-black text-slate-900">Group Member Leaderboard</h3>
        </div>

        <div className="flex items-center gap-1 bg-pink-50/80 p-1 rounded-xl border border-pink-100">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'month', label: 'This Month' },
            { id: 'week', label: 'This Week' },
          ].map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                timeframe === tf.id
                  ? 'bg-pink-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Podium for Top 3 */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 items-end pt-4 pb-2">
          {/* 2nd Place */}
          <div className="p-4 rounded-3xl bg-slate-100 border border-slate-200 text-center space-y-2 order-1 shadow-2xs">
            <span className="text-xl">🥈</span>
            <div>
              <p className="font-black text-xs text-slate-900 line-clamp-1">{leaderboard[1]?.name}</p>
              <p className="text-[10px] font-bold text-pink-600 mt-0.5">{leaderboard[1]?.xp} XP</p>
            </div>
            <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-200 text-slate-700">
              2nd Place
            </span>
          </div>

          {/* 1st Place */}
          <div className="p-5 rounded-3xl bg-gradient-to-b from-amber-100 via-amber-50 to-white border-2 border-amber-300 text-center space-y-2 order-2 shadow-md -mt-4">
            <span className="text-2xl">🥇</span>
            <div>
              <p className="font-black text-sm text-slate-900 line-clamp-1">{leaderboard[0]?.name}</p>
              <p className="text-xs font-black text-amber-600 mt-0.5">{leaderboard[0]?.xp} XP</p>
            </div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 shadow-xs">
              1st Champion
            </span>
          </div>

          {/* 3rd Place */}
          <div className="p-4 rounded-3xl bg-amber-50/60 border border-amber-200/60 text-center space-y-2 order-3 shadow-2xs">
            <span className="text-xl">🥉</span>
            <div>
              <p className="font-black text-xs text-slate-900 line-clamp-1">{leaderboard[2]?.name}</p>
              <p className="text-[10px] font-bold text-amber-700 mt-0.5">{leaderboard[2]?.xp} XP</p>
            </div>
            <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-200/60 text-amber-800">
              3rd Place
            </span>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="p-5 rounded-3xl bg-white border border-pink-200 shadow-2xs space-y-3">
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
          {leaderboard.map((item) => (
            <div
              key={item.userId}
              className={`p-3.5 flex items-center justify-between text-xs transition-colors ${
                item.rank === 1
                  ? 'bg-amber-50/50'
                  : item.rank === 2
                  ? 'bg-slate-50/60'
                  : item.rank === 3
                  ? 'bg-orange-50/30'
                  : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                  item.rank === 1
                    ? 'bg-amber-400 text-slate-900'
                    : item.rank === 2
                    ? 'bg-slate-300 text-slate-900'
                    : item.rank === 3
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  #{item.rank}
                </span>

                {item.avatarUrl ? (
                  <img src={item.avatarUrl} alt="" className="w-8 h-8 rounded-full border border-pink-200" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 font-extrabold flex items-center justify-center text-xs">
                    {item.name.charAt(0)}
                  </div>
                )}

                <div>
                  <p className="font-extrabold text-slate-900">{item.name}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    {item.studyDays} study days • Streak: {item.currentStreak}d
                  </p>
                </div>
              </div>

              <div className="text-right space-y-0.5">
                <div className="flex items-center gap-1 text-amber-600 font-black text-sm justify-end">
                  <Zap className="w-4 h-4 fill-amber-400 text-amber-500" />
                  <span>{item.xp} XP</span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold">
                  {item.totalStudyTimeFormatted}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
