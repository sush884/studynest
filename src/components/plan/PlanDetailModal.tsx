import React, { useState } from 'react';
import { StudyPlan, StudyDay, DayVideo } from '../../types';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';
import {
  X,
  Play,
  CheckCircle2,
  Clock,
  BookOpen,
  Edit2,
  Trash2,
  ExternalLink,
  Check,
  PauseCircle,
  Archive,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

interface PlanDetailModalProps {
  plan: StudyPlan;
  isOpen: boolean;
  onClose: () => void;
  onSelectDay: (day: StudyDay, plan: StudyPlan, videoIndex?: number) => void;
  onPlanUpdated: () => void;
  onDeletePlan: (planId: string) => void;
}

export const PlanDetailModal: React.FC<PlanDetailModalProps> = ({
  plan,
  isOpen,
  onClose,
  onSelectDay,
  onPlanUpdated,
  onDeletePlan,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(plan.title);
  const [editTarget, setEditTarget] = useState(plan.dailyTargetMinutes);
  const [editStatus, setEditStatus] = useState<string>(plan.status || 'active');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  if (!isOpen) return null;

  const totalDurationSecs = plan.totalDurationSeconds || plan.days.reduce((sum, d) => sum + d.actualDurationSeconds, 0);
  const totalHours = Math.floor(totalDurationSecs / 3600);
  const totalMins = Math.round((totalDurationSecs % 3600) / 60);
  const formattedTotalCourse = `${totalHours}h ${totalMins}m`;

  const totalVideos = plan.totalVideos || plan.days.reduce((sum, d) => sum + d.videos.length, 0);
  const completedVideos = plan.completedVideosCount || plan.days.reduce((sum, d) => sum + d.videos.filter((v) => v.completed).length, 0);
  const overallPercent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

  const handleToggleVideoWatched = async (day: StudyDay, vItem: DayVideo) => {
    try {
      const isCompleteNow = !vItem.completed;
      vItem.completed = isCompleteNow;
      await api.markVideoComplete(vItem.video.id || vItem.videoId, plan.id, isCompleteNow);
      if (isCompleteNow) {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      }
      onPlanUpdated();
    } catch (err) {
      console.error('Failed to update video status:', err);
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      await api.updateStudyPlan(plan.id, {
        title: editTitle,
        dailyTargetMinutes: editTarget,
        status: editStatus,
      });
      setIsEditing(false);
      onPlanUpdated();
    } catch (err) {
      console.error('Failed to update plan:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteStudyPlan(plan.id);
      onDeletePlan(plan.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete plan:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white border border-pink-200 rounded-3xl shadow-2xl overflow-hidden relative text-slate-800 my-6">
        {/* Header */}
        <div className="px-6 py-5 border-b border-pink-100 bg-white/90 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src={plan.thumbnailUrl}
              alt={plan.title}
              className="w-12 h-10 object-cover rounded-xl border border-pink-200 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-pink-700 bg-pink-100 px-2 py-0.5 rounded-md border border-pink-200">
                  {plan.status || 'active'}
                </span>
                <span className="text-xs text-slate-500 font-medium truncate">{plan.channelTitle}</span>
              </div>
              <h2 className="text-base font-black text-slate-900 truncate">{plan.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-slate-700 transition-colors text-xs font-bold flex items-center gap-1.5"
            >
              <Edit2 className="w-4 h-4 text-pink-600" />
              <span className="hidden sm:inline">Edit Plan</span>
            </button>

            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition-colors text-xs font-bold flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span className="hidden sm:inline">Delete</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-slate-500 hover:text-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* EDIT FORM DRAWER */}
          {isEditing && (
            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 space-y-4">
              <h3 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                Edit Study Plan Settings
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Study Plan Name</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Daily Target (Minutes)</label>
                  <input
                    type="number"
                    value={editTarget}
                    onChange={(e) => setEditTarget(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-extrabold text-slate-700">Status:</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-extrabold text-slate-800"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-slate-700 text-xs font-extrabold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DELETE CONFIRMATION DIALOG */}
          {deleteConfirmOpen && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 space-y-3">
              <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Are you sure you want to delete this study plan?</span>
              </div>
              <p className="text-xs text-rose-700/90 leading-relaxed font-medium">
                This will permanently remove "{plan.title}" and all associated session progress, saved notes, and completion logs.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-rose-200 text-slate-700 text-xs font-extrabold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          )}

          {/* OVERALL METRICS PANEL */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-pink-50/80 via-amber-50/50 to-emerald-50/80 border border-pink-200 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white border border-pink-200/80">
                <p className="text-[10px] text-slate-500 font-extrabold uppercase">Overall Progress</p>
                <p className="text-lg font-black text-pink-600 mt-0.5">{overallPercent}%</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-amber-200/80">
                <p className="text-[10px] text-amber-800 font-extrabold uppercase">Daily Target</p>
                <p className="text-lg font-black text-amber-900 mt-0.5">{plan.dailyTargetMinutes} minutes</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-emerald-200/80">
                <p className="text-[10px] text-emerald-800 font-extrabold uppercase">Total Course</p>
                <p className="text-lg font-black text-emerald-900 mt-0.5">{formattedTotalCourse}</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                <p className="text-[10px] text-slate-500 font-extrabold uppercase">Completed</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  {completedVideos} / {totalVideos} videos
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="w-full h-3 bg-pink-100 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 via-amber-400 to-emerald-500 transition-all duration-500"
                  style={{ width: `${overallPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* DAYS ROADMAP BREAKDOWN */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-pink-600" />
              <span>Daily Study Roadmap ({plan.days.length} Days)</span>
            </h3>

            <div className="space-y-4">
              {plan.days.map((day) => {
                const dayCompleted = day.status === 'completed';
                return (
                  <div
                    key={day.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      dayCompleted
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-white border-pink-200 hover:border-pink-300'
                    }`}
                  >
                    {/* Day Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-pink-100">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                            dayCompleted ? 'bg-emerald-500 text-white' : 'bg-pink-100 text-pink-800'
                          }`}
                        >
                          {day.dayNumber}
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">Day {day.dayNumber} Session</h4>
                          <p className="text-xs text-slate-500 font-medium">
                            Scheduled: {day.actualDurationFormatted} • {day.videos.length} videos
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onSelectDay(day, plan);
                          onClose();
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all self-start sm:self-auto"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Start Day {day.dayNumber}</span>
                      </button>
                    </div>

                    {/* Day Video Cards List */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {day.videos.map((vItem, vIdx) => {
                        const isWatched = vItem.completed;
                        return (
                          <div
                            key={vItem.id || vIdx}
                            className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                              isWatched
                                ? 'bg-emerald-50/80 border-emerald-200'
                                : 'bg-pink-50/30 border-pink-100 hover:border-pink-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <img
                                src={vItem.video.thumbnailUrl}
                                alt={vItem.video.title}
                                className="w-20 h-14 object-cover rounded-lg border border-pink-200 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-[10px] font-mono text-slate-500">
                                    #{vItem.video.position || vIdx + 1}
                                  </span>
                                  <span
                                    className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                      isWatched
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {isWatched ? '✓ Watched' : '⬜ Not Started'}
                                  </span>
                                </div>
                                <h5 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                                  {vItem.video.title}
                                </h5>
                                <p className="text-[11px] font-mono text-slate-500 mt-1">
                                  {vItem.video.durationFormatted}
                                </p>
                              </div>
                            </div>

                            {/* Watch on YouTube + Mark Watched Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-pink-100/80 gap-2">
                              <a
                                href={vItem.video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-extrabold text-pink-600 hover:text-pink-800 flex items-center gap-1 transition-colors"
                              >
                                <span>▶ Watch on YouTube</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>

                              <button
                                onClick={() => handleToggleVideoWatched(day, vItem)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all ${
                                  isWatched
                                    ? 'bg-emerald-200/80 text-emerald-900 hover:bg-emerald-300/80'
                                    : 'bg-white border border-pink-200 hover:bg-pink-100 text-slate-700'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                                <span>{isWatched ? 'Watched' : 'Mark Watched'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
