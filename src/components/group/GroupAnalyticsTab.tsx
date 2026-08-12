import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  BarChart3,
  Clock,
  TrendingUp,
  Users,
  Flame,
  CheckCircle2,
  Sparkles,
  Award,
} from 'lucide-react';

interface Props {
  groupId: string;
}

export const GroupAnalyticsTab: React.FC<Props> = ({ groupId }) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getGroupAnalytics(groupId);
      setAnalytics(data);
    } catch (err: any) {
      console.error('Failed to load group analytics:', err);
      setError(err.message || 'Failed to load group analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [groupId]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        <Sparkles className="w-8 h-8 text-pink-500 animate-spin mx-auto mb-2" />
        <p>Loading real group analytics...</p>
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
      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-pink-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Group Study Time</span>
            <Clock className="w-4 h-4 text-pink-600" />
          </div>
          <p className="text-xl font-black text-slate-900">{analytics?.totalGroupStudyTimeFormatted || '0 min'}</p>
          <p className="text-[10px] text-slate-400 font-semibold">Combined member effort</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-pink-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Avg Member Progress</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-slate-900">{analytics?.averageMemberProgressPercent || 0}%</p>
          <p className="text-[10px] text-slate-400 font-semibold">Curriculum completion</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-pink-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Today's Participation</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-slate-900">
            {analytics?.todayParticipation?.completedCount} / {analytics?.todayParticipation?.totalMembers}
          </p>
          <p className="text-[10px] text-slate-400 font-semibold">
            {analytics?.todayParticipation?.participationPercent}% met daily target
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-pink-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Group Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black text-slate-900">{analytics?.groupStreak || 0} Days</p>
          <p className="text-[10px] text-slate-400 font-semibold">
            Longest: {analytics?.longestGroupStreak || 0} Days
          </p>
        </div>
      </div>

      {/* Weekly Participation Graph */}
      <div className="p-5 rounded-3xl bg-white border border-pink-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-pink-600" />
            <h3 className="text-xs font-black text-slate-900">Weekly Participation Rate (%)</h3>
          </div>
        </div>

        <div className="pt-2 pb-1">
          <div className="flex items-end justify-between gap-2 h-36 border-b border-pink-100 px-2">
            {analytics?.weeklyParticipation?.map((item: any, idx: number) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shadow-md pointer-events-none z-10">
                  {item.participationPercent}% ({item.activeMembersCount} members)
                </div>

                <div className="w-full max-w-[28px] bg-pink-100 rounded-t-lg h-full flex items-end overflow-hidden">
                  <div
                    className="w-full bg-gradient-to-t from-pink-600 to-amber-400 rounded-t-lg transition-all duration-500"
                    style={{ height: `${item.participationPercent}%` }}
                  ></div>
                </div>

                <span className="text-[10px] font-bold text-slate-500 mt-1">{item.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Member Performance Table */}
      <div className="p-5 rounded-3xl bg-white border border-pink-200 shadow-2xs space-y-3">
        <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Member Analytics Breakdown</span>
        </h3>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
          {analytics?.members?.map((m: any) => (
            <div key={m.userId} className="p-3.5 flex items-center justify-between bg-white text-xs">
              <div className="flex items-center gap-3">
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt="" className="w-8 h-8 rounded-full border border-pink-200" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 font-extrabold flex items-center justify-center text-xs">
                    {m.userName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-extrabold text-slate-900">{m.userName}</p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Study Time: {m.totalStudyTimeFormatted} • Streak: {m.streak}d
                  </p>
                </div>
              </div>

              <div className="text-right space-y-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  m.completedToday
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {m.completedToday ? 'Goal Completed Today' : `${m.todayStudyMinutes || 0} min today`}
                </span>
                <p className="text-[10px] text-slate-400 font-semibold">
                  Progress: {m.progressPercent}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
