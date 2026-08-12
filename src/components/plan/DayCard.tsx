import React from 'react';
import { StudyDay } from '../../types';
import { Clock, BookOpen, CheckCircle2, Play, Sparkles } from 'lucide-react';

interface DayCardProps {
  day: StudyDay;
  onSelectDay: (day: StudyDay, videoIndex?: number) => void;
  onToggleComplete?: (dayId: string, currentStatus: string) => void;
}

export const DayCard: React.FC<DayCardProps> = ({
  day,
  onSelectDay,
  onToggleComplete,
}) => {
  const completedCount = day.videos.filter(v => v.completed).length;
  const totalCount = day.videos.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isCompleted = day.status === 'completed' || progressPercent === 100;

  return (
    <div
      className={`p-5 rounded-2xl border transition-all ${
        isCompleted
          ? 'bg-emerald-50/90 border-emerald-200/90 shadow-xs'
          : day.status === 'in_progress'
          ? 'bg-amber-50/90 border-amber-200/90 shadow-xs'
          : 'bg-white/90 border-pink-100 hover:border-pink-300 shadow-2xs'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">Day {day.dayNumber}</span>
          {day.isLongSession && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              Long Session
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1 text-slate-700 font-medium">
            <Clock className="w-3.5 h-3.5 text-pink-500" />
            {day.totalDurationFormatted}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-slate-700 font-medium">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            {totalCount} {totalCount === 1 ? 'video' : 'videos'}
          </span>
        </div>
      </div>

      {/* Video Topics List */}
      <div className="space-y-1 my-3">
        {day.videos.slice(0, 3).map((vItem, idx) => (
          <div
            key={vItem.id || idx}
            onClick={(e) => {
              e.stopPropagation();
              onSelectDay(day, idx);
            }}
            className="text-xs text-slate-700 hover:text-slate-900 flex items-center justify-between gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-pink-50/80 transition-colors group"
            title="Click to play in StudyNest"
          >
            <span className="truncate font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-300 group-hover:bg-pink-500 shrink-0 transition-colors"></span>
              {vItem.video.title}
            </span>
            <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-800 shrink-0">{vItem.video.durationFormatted}</span>
          </div>
        ))}
        {day.videos.length > 3 && (
          <p className="text-[11px] text-slate-500 italic pt-1">
            + {day.videos.length - 3} more videos in this session
          </p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="font-medium">Progress</span>
            <span className="font-bold text-slate-800">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-pink-500 via-amber-400 to-emerald-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onSelectDay(day)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
            isCompleted
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 shadow-2xs'
              : day.status === 'in_progress'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-2xs hover:bg-amber-300 border border-amber-500/40'
              : 'bg-pink-500 text-white hover:bg-pink-600 shadow-xs'
          }`}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Completed</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{day.status === 'in_progress' ? 'Continue' : 'Start Day'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
