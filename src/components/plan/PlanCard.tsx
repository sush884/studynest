import React from 'react';
import { StudyPlan } from '../../types';
import { BookOpen, Clock, Calendar, ArrowRight, Trash2, CheckCircle2 } from 'lucide-react';

interface PlanCardProps {
  plan: StudyPlan;
  onOpenPlan: (plan: StudyPlan) => void;
  onDeletePlan?: (planId: string) => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  onOpenPlan,
  onDeletePlan,
}) => {
  const percent = plan.totalVideos > 0 ? Math.round((plan.completedVideosCount / plan.totalVideos) * 100) : 0;
  const isFinished = percent === 100;

  return (
    <div className="p-5 rounded-2xl bg-white/95 border border-pink-200/90 hover:border-pink-300 shadow-2xs transition-all flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <img
              src={plan.thumbnailUrl}
              alt={plan.title}
              className="w-16 h-12 object-cover rounded-xl border border-pink-200 shrink-0"
            />
            <div>
              <h3 className="text-sm font-black text-slate-900 group-hover:text-pink-600 transition-colors line-clamp-1">
                {plan.title}
              </h3>
              <p className="text-xs text-slate-500 font-medium">{plan.channelTitle}</p>
            </div>
          </div>

          {onDeletePlan && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this study plan?')) {
                  onDeletePlan(plan.id);
                }
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Plan Specs */}
        <div className="grid grid-cols-3 gap-2 my-4 text-center text-xs">
          <div className="p-2 rounded-xl bg-pink-50/50 border border-pink-100">
            <p className="text-[10px] text-slate-500 font-extrabold">Videos</p>
            <p className="font-black text-slate-800">{plan.totalVideos}</p>
          </div>
          <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200">
            <p className="text-[10px] text-amber-800 font-extrabold">Daily Target</p>
            <p className="font-black text-amber-900">{plan.dailyTargetMinutes}m</p>
          </div>
          <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <p className="text-[10px] text-emerald-800 font-extrabold">Est. Roadmap</p>
            <p className="font-black text-emerald-900">{plan.estimatedDays} days</p>
          </div>
        </div>
      </div>

      {/* Progress & Action */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
          <span>Overall Progress</span>
          <span className="font-extrabold text-slate-800">{percent}%</span>
        </div>
        <div className="w-full h-2 bg-pink-100 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full transition-all duration-500 ${
              isFinished ? 'bg-emerald-500' : 'bg-gradient-to-r from-pink-500 via-amber-400 to-emerald-400'
            }`}
            style={{ width: `${percent}%` }}
          ></div>
        </div>

        <button
          onClick={() => onOpenPlan(plan)}
          className="w-full py-2.5 px-4 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
        >
          <span>{isFinished ? 'Review Roadmap' : 'Open Study Roadmap'}</span>
          <ArrowRight className="w-4 h-4 text-pink-600" />
        </button>
      </div>
    </div>
  );
};
