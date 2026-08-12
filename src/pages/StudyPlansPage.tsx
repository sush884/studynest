import React from 'react';
import { StudyPlan } from '../types';
import { PlanCard } from '../components/plan/PlanCard';
import { PlusCircle, BookOpen } from 'lucide-react';

interface StudyPlansPageProps {
  plans: StudyPlan[];
  onOpenPlan: (plan: StudyPlan) => void;
  onOpenCreate: () => void;
  onDeletePlan: (planId: string) => void;
}

export const StudyPlansPage: React.FC<StudyPlansPageProps> = ({
  plans,
  onOpenPlan,
  onOpenCreate,
  onDeletePlan,
}) => {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">My Study Plans</h1>
          <p className="text-xs text-slate-500 font-medium">All active and completed YouTube playlist study plans</p>
        </div>

        <button
          onClick={onOpenCreate}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold text-xs shadow-xs flex items-center gap-2 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Study Plan</span>
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="p-12 text-center bg-white/90 border border-pink-200 rounded-3xl space-y-3 shadow-2xs">
          <BookOpen className="w-10 h-10 text-pink-400 mx-auto" />
          <h3 className="text-sm font-black text-slate-900">No study plans created yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            Click "New Study Plan" to paste a YouTube playlist URL and auto-generate a 1-hour study schedule.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onOpenPlan={onOpenPlan}
              onDeletePlan={onDeletePlan}
            />
          ))}
        </div>
      )}
    </div>
  );
};
