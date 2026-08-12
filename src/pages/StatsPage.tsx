import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  Calendar as CalendarIcon,
  Flame,
  Award,
  BookOpen,
  TrendingUp,
  Target,
  Plus,
  Trash2,
  ChevronRight,
  Sparkles,
  Info,
  CalendarRange,
  X,
  PlayCircle,
} from 'lucide-react';

export const StatsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<string>('week');
  const [analytics, setAnalytics] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Goal Modal
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [goalTitle, setGoalTitle] = useState<string>('');
  const [goalType, setGoalType] = useState<string>('study_time_minutes');
  const [goalTarget, setGoalTarget] = useState<number>(300);
  const [goalStartDate, setGoalStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [goalEndDate, setGoalEndDate] = useState<string>(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [savingGoal, setSavingGoal] = useState<boolean>(false);

  // Course Detail Modal
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseDetail, setCourseDetail] = useState<any>(null);
  const [loadingCourseDetail, setLoadingCourseDetail] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsData, goalsData] = await Promise.all([
        api.getAnalytics(timeRange),
        api.getGoals(),
      ]);
      setAnalytics(analyticsData);
      setGoals(goalsData);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
      setError(err.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    setSavingGoal(true);
    try {
      await api.createGoal({
        title: goalTitle,
        type: goalType,
        target: Number(goalTarget),
        startDate: goalStartDate,
        endDate: goalEndDate,
      });
      setShowGoalModal(false);
      setGoalTitle('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create goal');
    } finally {
      setSavingGoal(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await api.deleteGoal(goalId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete goal');
    }
  };

  const openCourseDetail = async (courseId: string) => {
    setSelectedCourseId(courseId);
    setLoadingCourseDetail(true);
    try {
      const detail = await api.getCourseDetailAnalytics(courseId);
      setCourseDetail(detail);
    } catch (err: any) {
      console.error('Failed to load course details:', err);
    } finally {
      setLoadingCourseDetail(false);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        <Sparkles className="w-8 h-8 text-pink-500 animate-spin mx-auto mb-2" />
        <p>Calculating real study analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 select-none">
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-pink-600" />
            <span>Personal Analytics & Goals</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real-time dynamically calculated statistics from your database study activity
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1 bg-white/90 p-1.5 rounded-2xl border border-pink-200 shadow-2xs overflow-x-auto">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: '30days', label: 'Last 30 Days' },
            { id: 'year', label: 'This Year' },
            { id: 'all', label: 'All Time' },
          ].map((range) => (
            <button
              key={range.id}
              onClick={() => setTimeRange(range.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                timeRange === range.id
                  ? 'bg-pink-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-pink-50 hover:text-pink-700'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Streak Qualifier Notice */}
      <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs leading-relaxed">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-black">Personal Streak Rule: </span>
          A study day qualifies when you complete a study session or video satisfying your plan's daily requirement.
          Missing a day cleanly breaks your active streak.
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/95 border border-pink-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Study Time</span>
            <Clock className="w-4 h-4 text-pink-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{analytics?.totalStudyTimeFormatted || '0 min'}</p>
          <p className="text-[10px] font-semibold text-slate-400">
            In selected timeframe ({timeRange})
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/95 border border-pink-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Videos Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{analytics?.videosCompleted || 0}</p>
          <p className="text-[10px] font-semibold text-slate-400">
            {analytics?.videosRemaining || 0} remaining in plans
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/95 border border-pink-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Current Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{analytics?.currentStreak || 0} days</p>
          <p className="text-[10px] font-semibold text-slate-400">
            Longest: {analytics?.longestStreak || 0} days
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/95 border border-pink-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Daily Study</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{analytics?.averageDailyMinutes || 0} min</p>
          <p className="text-[10px] font-semibold text-slate-400">
            Over {analytics?.studyDays || 0} study days
          </p>
        </div>
      </div>

      {/* Comparisons Row (This Week, Month, All Time) */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-pink-100">Study Time Breakdown</h3>
          <p className="text-lg font-black mt-0.5">Summary Comparisons</p>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <p className="text-[10px] uppercase font-bold text-pink-100">This Week</p>
            <p className="text-xl font-black">{analytics?.summaryComparison?.thisWeek || '0 min'}</p>
          </div>
          <div className="w-px h-8 bg-white/20"></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-pink-100">This Month</p>
            <p className="text-xl font-black">{analytics?.summaryComparison?.thisMonth || '0 min'}</p>
          </div>
          <div className="w-px h-8 bg-white/20"></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-pink-100">All Time</p>
            <p className="text-xl font-black">{analytics?.summaryComparison?.allTime || '0 min'}</p>
          </div>
        </div>
      </div>

      {/* Daily Graph Visualization */}
      <div className="p-6 rounded-3xl bg-white/95 border border-pink-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-pink-600" />
            <h2 className="text-sm font-black text-slate-900">Daily Study Activity (Minutes)</h2>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Total {analytics?.totalStudyTimeFormatted || '0 min'}
          </span>
        </div>

        {analytics?.dailyGraph?.length > 0 ? (
          <div className="pt-4 pb-2">
            <div className="flex items-end justify-between gap-2 h-44 border-b border-pink-100 px-2">
              {analytics.dailyGraph.map((d: any, idx: number) => {
                const maxMins = Math.max(60, ...analytics.dailyGraph.map((g: any) => g.minutes));
                const heightPercent = Math.min(100, Math.round((d.minutes / maxMins) * 100));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Hover tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap shadow-md pointer-events-none z-10">
                      {d.date}: {d.minutes} min ({d.videoCount} vids)
                    </div>

                    {/* Bar */}
                    <div className="w-full max-w-[32px] bg-pink-100 rounded-t-lg h-full flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          d.minutes > 0
                            ? 'bg-gradient-to-t from-pink-600 to-rose-400 group-hover:from-pink-500 group-hover:to-rose-300'
                            : 'bg-transparent'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      ></div>
                    </div>

                    <span className="text-[10px] font-bold text-slate-500 mt-1">{d.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            No study activity logged yet for this period. Complete videos to see your daily activity graph!
          </div>
        )}
      </div>

      {/* Courses Analytics Breakdown */}
      <div className="p-6 rounded-3xl bg-white/95 border border-pink-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-black text-slate-900">Course Completion Analytics</h2>
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            {analytics?.coursesCompleted || 0} Completed Courses
          </span>
        </div>

        {analytics?.courses?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.courses.map((course: any) => (
              <div
                key={course.courseId}
                onClick={() => openCourseDetail(course.courseId)}
                className="p-4 rounded-2xl border border-slate-200 hover:border-pink-300 bg-white/80 hover:bg-pink-50/30 transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-2xs group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt=""
                        className="w-12 h-10 rounded-lg object-cover shadow-xs border border-slate-200"
                      />
                    ) : (
                      <div className="w-12 h-10 rounded-lg bg-pink-100 text-pink-600 font-bold text-xs flex items-center justify-center">
                        Course
                      </div>
                    )}
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-900 group-hover:text-pink-600 transition-colors line-clamp-1">
                        {course.title}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {course.completedVideos} / {course.totalVideos} videos completed ({course.completedDurationFormatted})
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-pink-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                {/* Course Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-600">
                    <span>Progress</span>
                    <span>{course.progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${course.progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            No study plans created yet. Create a study plan to start tracking course completion!
          </div>
        )}
      </div>

      {/* Goal Tracking Section */}
      <div className="p-6 rounded-3xl bg-white/95 border border-pink-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-black text-slate-900">Personal Learning Goals</h2>
          </div>
          <button
            onClick={() => setShowGoalModal(true)}
            className="flex items-center gap-1.5 text-xs font-black text-white bg-pink-600 hover:bg-pink-700 px-3.5 py-2 rounded-xl transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Set New Goal
          </button>
        </div>

        {goals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => {
              const progressPercent = Math.min(
                100,
                Math.round(((goal.currentValue || 0) / (goal.target || 1)) * 100)
              );
              const isCompleted = goal.status === 'completed' || progressPercent >= 100;

              return (
                <div
                  key={goal.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isCompleted
                      ? 'bg-emerald-50/80 border-emerald-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>{goal.title}</span>
                        {isCompleted && (
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 uppercase">
                            Achieved
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-semibold mt-1 flex items-center gap-2">
                        <span>
                          Target: {goal.target} {goal.type === 'study_time_minutes' ? 'minutes' : 'videos'}
                        </span>
                        <span>•</span>
                        <span>
                          {goal.startDate} to {goal.endDate}
                        </span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Goal Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-600">
                      <span>
                        Current: {goal.currentValue || 0} / {goal.target}
                      </span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-emerald-500' : 'bg-amber-400'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            No active learning goals set yet. Click "Set New Goal" to track custom study time or video targets!
          </div>
        )}
      </div>

      {/* Course Detail Modal */}
      {selectedCourseId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-pink-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 line-clamp-1">
                {courseDetail?.title || 'Course Details'}
              </h3>
              <button
                onClick={() => {
                  setSelectedCourseId(null);
                  setCourseDetail(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingCourseDetail ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                Loading course statistics...
              </div>
            ) : courseDetail ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-pink-50 border border-pink-100">
                    <p className="text-[10px] font-bold uppercase text-pink-600">Completed Videos</p>
                    <p className="text-lg font-black text-slate-900">
                      {courseDetail.completedVideos} / {courseDetail.totalVideos}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                    <p className="text-[10px] font-bold uppercase text-indigo-600">Completed Study Time</p>
                    <p className="text-lg font-black text-slate-900">
                      {courseDetail.completedStudyTimeFormatted}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800">Recent Completed Sessions in this Course</h4>
                  {courseDetail.recentActivity?.length > 0 ? (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {courseDetail.recentActivity.map((act: any) => (
                        <div key={act.id} className="p-2.5 flex items-center justify-between bg-white">
                          <div className="flex items-center gap-2">
                            <PlayCircle className="w-4 h-4 text-pink-600" />
                            <span className="font-semibold text-slate-800">Video Session</span>
                          </div>
                          <span className="text-[10px] font-medium text-slate-400">
                            {new Date(act.completedAt).toLocaleDateString()} ({act.durationFormatted})
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-[11px]">No videos completed yet in this course.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-pink-200 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                <span>Create Learning Goal</span>
              </h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. Complete 10 hours of Python this month"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Goal Type</label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs"
                >
                  <option value="study_time_minutes">Total Study Time (Minutes)</option>
                  <option value="completed_videos">Videos Completed</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Number</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={goalStartDate}
                    onChange={(e) => setGoalStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target End Date</label>
                  <input
                    type="date"
                    required
                    value={goalEndDate}
                    onChange={(e) => setGoalEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGoal}
                  className="px-4 py-2 rounded-xl font-black text-white bg-pink-600 hover:bg-pink-700 shadow-xs"
                >
                  {savingGoal ? 'Saving...' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
