import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  PlayCircle,
  X,
  Sparkles,
  History,
  Flame,
  Info,
} from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [calendarData, setCalendarData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Day Detail Modal
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [dayDetails, setDayDetails] = useState<any>(null);
  const [loadingDayDetails, setLoadingDayDetails] = useState<boolean>(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const [cal, hist] = await Promise.all([
        api.getCalendar(year, month),
        api.getStudyHistory(),
      ]);
      setCalendarData(cal);
      setHistory(hist);
    } catch (err) {
      console.error('Failed to load study calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, [year, month]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
  };

  const openDayDetails = async (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setLoadingDayDetails(true);
    try {
      const details = await api.getDayDetails(dateStr);
      setDayDetails(details);
    } catch (err) {
      console.error('Failed to load day details:', err);
    } finally {
      setLoadingDayDetails(false);
    }
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Calculate grid padding for first day of month
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
  const paddingDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  if (loading && !calendarData) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        <Sparkles className="w-8 h-8 text-pink-500 animate-spin mx-auto mb-2" />
        <p>Loading real study calendar...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 select-none">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-pink-600" />
            <span>Study Calendar & History</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Track your daily study activity, streak qualifications, and video logs
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-3 bg-white/90 p-2 rounded-2xl border border-pink-200 shadow-2xs">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-xl hover:bg-pink-50 text-slate-600 hover:text-pink-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-black text-slate-900 min-w-[120px] text-center">
            {monthName} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-xl hover:bg-pink-50 text-slate-600 hover:text-pink-600 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Legend */}
      <div className="flex flex-wrap items-center justify-between p-4 rounded-2xl bg-white/95 border border-pink-200 shadow-2xs text-xs gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-2xs"></span>
            <span>Completed (30+ min)</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <span className="w-3 h-3 rounded-full bg-amber-400 shadow-2xs"></span>
            <span>Partially Completed</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <span className="w-3 h-3 rounded-full bg-slate-200"></span>
            <span>Rest / Not Started</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1 rounded-full font-bold border border-amber-200">
          <Flame className="w-4 h-4 text-amber-500" />
          <span>Active Streak: {calendarData?.currentStreak || 0} Days</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6 rounded-3xl bg-white/95 border border-pink-200 shadow-2xs space-y-4">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 text-center font-black text-xs text-slate-400 uppercase tracking-wider pb-2 border-b border-pink-100">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty padding cells */}
          {paddingDays.map((_, idx) => (
            <div key={`pad-${idx}`} className="h-20 md:h-24 rounded-2xl bg-slate-50/40 border border-slate-100 opacity-30"></div>
          ))}

          {/* Calendar days */}
          {calendarData?.days?.map((day: any) => {
            const isCompleted = day.status === 'completed';
            const isPartial = day.status === 'partially_completed';

            return (
              <div
                key={day.dateStr}
                onClick={() => openDayDetails(day.dateStr)}
                className={`h-20 md:h-24 p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shadow-2xs hover:scale-[1.02] ${
                  isCompleted
                    ? 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 border-emerald-300'
                    : isPartial
                    ? 'bg-gradient-to-br from-amber-50 via-white to-amber-50/40 border-amber-300'
                    : 'bg-white border-slate-150 hover:border-pink-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-black text-xs ${
                      isCompleted
                        ? 'text-emerald-800'
                        : isPartial
                        ? 'text-amber-800'
                        : 'text-slate-700'
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                  {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>

                <div>
                  {day.videosCount > 0 ? (
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-extrabold text-slate-800">
                        {day.studyMinutes} min
                      </p>
                      <p className="text-[9px] font-semibold text-slate-400">
                        {day.videosCount} {day.videosCount === 1 ? 'video' : 'videos'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[9px] font-medium text-slate-300">Rest day</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chronological History Feed */}
      <div className="p-6 rounded-3xl bg-white/95 border border-pink-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-pink-600" />
          <h2 className="text-sm font-black text-slate-900">Recent Completed Sessions History</h2>
        </div>

        {history.length > 0 ? (
          <div className="divide-y divide-pink-50 border border-slate-200 rounded-2xl overflow-hidden">
            {history.slice(0, 15).map((item) => (
              <div key={item.id} className="p-3.5 flex items-center justify-between bg-white hover:bg-pink-50/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                    <PlayCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 line-clamp-1">{item.videoTitle}</h4>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      {item.courseTitle} • {item.durationFormatted}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500">{item.dateStr}</span>
                  <p className="text-[9px] font-semibold text-emerald-600">Completed</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            No videos completed yet. Watch and mark videos complete in your study plans to populate your calendar feed!
          </div>
        )}
      </div>

      {/* Day Details Modal */}
      {selectedDateStr && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-pink-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-sm text-slate-900">
                  Study Log: {selectedDateStr}
                </h3>
                {dayDetails && (
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    Total Duration: {dayDetails.totalDurationFormatted} ({dayDetails.completedVideosCount} videos)
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedDateStr(null);
                  setDayDetails(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDayDetails ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                Loading study log details...
              </div>
            ) : dayDetails?.videos?.length > 0 ? (
              <div className="space-y-3">
                {dayDetails.videos.map((vid: any) => (
                  <div key={vid.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-extrabold text-slate-900">{vid.title}</h4>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {vid.courseTitle} • {vid.durationFormatted}
                      </p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                No videos were recorded as completed on {selectedDateStr}.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
