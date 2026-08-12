import React from 'react';
import { StudyPlan, StudyDay, User } from '../types';
import {
  Flame,
  Clock,
  BookOpen,
  PlusCircle,
  Play,
  Users,
  Target,
  ArrowRight,
  Sparkles,
  Award
} from 'lucide-react';
import { DayCard } from '../components/plan/DayCard';

interface DashboardPageProps {
  user: User;
  activePlan: StudyPlan | null;
  todaySession: StudyDay | null;
  stats: any;
  onSelectDay: (day: StudyDay, plan: StudyPlan, videoIndex?: number) => void;
  onOpenCreate: () => void;
  onViewPlans: () => void;
  onViewGroups?: () => void;
  onPlanUpdated: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  activePlan,
  todaySession,
  stats,
  onSelectDay,
  onOpenCreate,
  onViewPlans,
  onViewGroups,
}) => {
  const progressPercent = activePlan && activePlan.totalVideos > 0
    ? Math.round((activePlan.completedVideosCount / activePlan.totalVideos) * 100)
    : 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Welcome Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Good Morning, {user.name} 👋
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Choose your learning mode for today and stay consistent!
          </p>
        </div>

        {/* User Streak Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-100/90 border border-amber-300 text-amber-900 font-extrabold text-sm shadow-xs self-start md:self-auto">
          <Flame className="w-5 h-5 fill-amber-500 text-amber-600 animate-pulse" />
          <span>{user.currentStreak || 0} Day Streak</span>
        </div>
      </div>

      {/* Mode Selector Cards: SELF STUDY vs GROUP STUDY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SELF STUDY CARD */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-white via-pink-50/40 to-white border border-pink-200/90 shadow-sm flex flex-col justify-between space-y-4 hover:border-pink-300 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center text-xl shadow-md shadow-pink-500/20">
                📚
              </div>
              <span className="text-xs font-bold text-pink-700 bg-pink-100 px-3 py-1 rounded-full border border-pink-200">
                Self Study Mode
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Self Study</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Study independently at your own pace. Convert YouTube educational playlists into structured daily study sessions.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-3">
            {activePlan ? (
              <button
                onClick={onViewPlans}
                className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-md shadow-pink-500/20 inline-flex items-center gap-2 transition-all"
              >
                <BookOpen className="w-4 h-4" />
                <span>My Study Plans ({stats?.totalPlansCount || 1})</span>
              </button>
            ) : (
              <button
                onClick={onOpenCreate}
                className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-md shadow-pink-500/20 inline-flex items-center gap-2 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create First Plan</span>
              </button>
            )}
          </div>
        </div>

        {/* GROUP STUDY CARD */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-white via-emerald-50/40 to-white border border-emerald-200/90 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl shadow-md shadow-emerald-500/20">
                👥
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                Group Study Mode
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Group Study</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Study together with friends using a shared learning plan, group streak tracking, live status indicators, and real-time chat rooms.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={onViewGroups}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 inline-flex items-center gap-2 transition-all"
            >
              <Users className="w-4 h-4" />
              <span>Open Study Groups</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Study Plan Banner */}
      {activePlan ? (
        <div className="p-6 md:p-8 rounded-3xl bg-white/95 border border-pink-200/90 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <img
                src={activePlan.thumbnailUrl}
                alt={activePlan.title}
                className="w-20 h-16 object-cover rounded-2xl border border-pink-200 shadow-xs shrink-0"
              />
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-700 bg-pink-100 px-2.5 py-0.5 rounded-full border border-pink-200">
                  Active Study Plan
                </span>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1">{activePlan.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activePlan.channelTitle} • {activePlan.totalVideos} videos • {activePlan.dailyTargetMinutes}m / day
                </p>
              </div>
            </div>

            {/* Overall Progress */}
            <div className="flex items-center gap-4 bg-pink-50/70 p-3.5 rounded-2xl border border-pink-200/80">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-600 gap-4 mb-1">
                  <span className="text-[10px] font-bold uppercase">Course Progress</span>
                  <span className="font-extrabold text-slate-900">{progressPercent}%</span>
                </div>
                <div className="w-32 h-2.5 bg-pink-100/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-white/95 border border-pink-200 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-pink-100 border border-pink-200 text-pink-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">No active study plan yet</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Paste any educational YouTube playlist URL to generate your first 1-hour daily study roadmap.
          </p>
          <button
            onClick={onOpenCreate}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-pink-500/20 inline-flex items-center gap-2 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Study Plan</span>
          </button>
        </div>
      )}

      {/* Today's Session Highlight */}
      {activePlan && todaySession && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-pink-600" />
              <span>Today's Session</span>
            </h2>
            <span className="text-xs text-slate-500 font-semibold">
              Target: ~{activePlan.dailyTargetMinutes} minutes
            </span>
          </div>

          <div className="p-6 rounded-3xl bg-white/95 border border-amber-200/80 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-pink-100">
                <span className="text-sm font-extrabold text-slate-900">Day {todaySession.dayNumber} Session</span>
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Total: {todaySession.actualDurationFormatted}
                </span>
              </div>

              {/* Videos List */}
              <div className="space-y-2">
                {todaySession.videos.map((vItem, idx) => (
                  <div
                    key={vItem.id || idx}
                    onClick={() => onSelectDay(todaySession, activePlan, idx)}
                    className="p-3 rounded-xl bg-pink-50/50 border border-pink-100 hover:border-pink-300 hover:bg-pink-50 cursor-pointer flex items-center justify-between gap-3 transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-pink-200 group-hover:bg-pink-500 group-hover:text-white text-pink-800 font-bold text-xs flex items-center justify-center shrink-0 transition-colors">
                        {idx + 1}
                      </span>
                      <p className="text-xs font-semibold text-slate-800 group-hover:text-pink-700 truncate">{vItem.video.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-pink-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Play ▶
                      </span>
                      <span className="text-xs font-mono text-slate-500">{vItem.video.durationFormatted}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    // Find earliest incomplete day and video index
                    let targetDay = todaySession;
                    let targetVideoIdx = 0;

                    for (const day of activePlan.days) {
                      const firstIncompleteIdx = day.videos.findIndex((v) => !v.completed);
                      if (firstIncompleteIdx !== -1) {
                        targetDay = day;
                        targetVideoIdx = firstIncompleteIdx;
                        break;
                      }
                    }

                    onSelectDay(targetDay, activePlan, targetVideoIdx);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-pink-500/20 flex items-center gap-2 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Continue Learning</span>
                </button>
              </div>
            </div>

            {/* Motivation Widget */}
            <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-extrabold text-amber-900 mb-2">Daily Consistency Rule</h3>
                <p className="text-xs text-amber-800/90 leading-relaxed mb-4">
                  "Small daily sessions compound faster than irregular weekend marathon study sessions."
                </p>
              </div>

              <div className="pt-4 border-t border-amber-200 text-[11px] text-amber-900 font-bold flex items-center gap-1.5">
                <Flame className="w-4 h-4 fill-amber-500 text-amber-600" />
                <span>Keep your {user.currentStreak || 0}-day streak alive today!</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick Stats Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/95 border border-pink-200/90 shadow-2xs">
          <p className="text-[11px] text-slate-500 font-semibold">Total Study Time</p>
          <p className="text-xl font-extrabold text-pink-600 mt-1">{stats?.totalWatchTimeFormatted || '0m'}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/95 border border-emerald-200/90 shadow-2xs">
          <p className="text-[11px] text-slate-500 font-semibold">Videos Completed</p>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">{stats?.totalVideosCompleted || 0} videos</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/95 border border-emerald-200/90 shadow-2xs">
          <p className="text-[11px] text-slate-500 font-semibold">Days Finished</p>
          <p className="text-xl font-extrabold text-emerald-700 mt-1">{stats?.totalDaysCompleted || 0} days</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/95 border border-amber-200/90 shadow-2xs">
          <p className="text-[11px] text-slate-500 font-semibold">Active Streak</p>
          <p className="text-xl font-extrabold text-amber-700 mt-1">{user.currentStreak || 0} Days 🔥</p>
        </div>
      </section>

      {/* Study Plan Days Grid */}
      {activePlan && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Full Course Roadmap</h2>
            <button
              onClick={onViewPlans}
              className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1"
            >
              <span>View All Plans</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePlan.days.map((d) => (
              <DayCard
                key={d.id}
                day={d}
                onSelectDay={(day) => onSelectDay(day, activePlan)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
