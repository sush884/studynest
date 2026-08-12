import React from 'react';
import {
  BookOpen,
  Users,
  Sparkles,
  Flame,
  GraduationCap,
  ArrowRight,
  Play,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface LandingPageProps {
  userName?: string;
  onSelectSelfStudy: () => void;
  onSelectGroupStudy: () => void;
  onStartCreatePlan: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  userName,
  onSelectSelfStudy,
  onSelectGroupStudy,
  onStartCreatePlan,
}) => {
  const greetingName = userName ? `, ${userName}` : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/90 via-amber-50/60 to-emerald-50/90 text-slate-900 overflow-x-hidden selection:bg-pink-500 selection:text-white pb-16 font-sans">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-pink-300/30 via-amber-200/20 to-transparent blur-3xl pointer-events-none"></div>

      {/* Top Bar Navigation */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-amber-400 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900 block">StudyNest</span>
            <span className="text-[10px] text-slate-500 -mt-1 block font-medium">Learn together. Stay consistent. Grow together.</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onStartCreatePlan}
            className="px-4 py-2 rounded-xl bg-white border border-pink-200/80 text-slate-700 hover:text-pink-600 hover:bg-pink-50 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>+ New YouTube Plan</span>
          </button>
        </div>
      </header>

      {/* Home Hero Greeting */}
      <section className="max-w-5xl mx-auto px-6 pt-8 pb-10 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-100 border border-pink-200 text-pink-800 text-xs font-bold mb-6 shadow-2xs">
          <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Personal Learning Portal for You & Your Friends</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
          Hello{greetingName} 👋
        </h1>

        <p className="text-xl md:text-2xl text-slate-600 font-semibold max-w-2xl mx-auto mb-10">
          What are you studying today?
        </p>

        {/* TWO MAJOR CHOICES: SELF STUDY (PINK) & GROUP STUDY (YELLOW/GREEN) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* OPTION 1: SELF STUDY (PINK THEME) */}
          <div className="group relative rounded-3xl bg-white/95 border border-pink-200/90 hover:border-pink-400 p-8 text-left transition-all hover:shadow-xl hover:shadow-pink-500/10 flex flex-col justify-between shadow-sm">
            <div className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-pink-100 border border-pink-200 flex items-center justify-center text-pink-600 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-pink-700 bg-pink-100 px-3 py-1 rounded-full border border-pink-200 inline-block mb-4">
                Option 1
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2 flex items-center gap-2">
                📚 Self Study
              </h2>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                Learn at your own pace. Turn any YouTube playlist into your personal 1-hour daily study roadmap with completion tracking, notes, and personal streaks.
              </p>

              {/* Feature Highlights */}
              <ul className="text-xs text-slate-700 space-y-2.5 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-medium">Personal Study Plan Generator (30m - 90m target)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-medium">Return-to-Study Watch & Completion System</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-medium">Personal Streak & Progress Analytics</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onSelectSelfStudy}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:opacity-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-pink-500/25 active:scale-98 transition-all"
            >
              <span>Start Self Study</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* OPTION 2: GROUP STUDY (YELLOW & GREEN ACCENTS) */}
          <div className="group relative rounded-3xl bg-white/95 border border-amber-200/90 hover:border-amber-400 p-8 text-left transition-all hover:shadow-xl hover:shadow-amber-500/10 flex flex-col justify-between shadow-sm">
            <div className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200 inline-block mb-4">
                Option 2
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2 flex items-center gap-2">
                👥 Group Study
              </h2>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                Learn together with your friends. Share a study plan, track member completion, maintain group streaks, and discuss doubts in real-time chat.
              </p>

              {/* Feature Highlights */}
              <ul className="text-xs text-slate-700 space-y-2.5 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-medium">Shared Group Study Room & Member Dashboards</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-medium">Group Streaks (60% Participation Rule)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-medium">Real-Time Chat Channels & Daily Discussions</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onSelectGroupStudy}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:opacity-95 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-98 transition-all"
            >
              <span>Open Group Study</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Quick Visual Explanation */}
      <section className="max-w-5xl mx-auto px-6 py-6 border-t border-pink-100/80">
        <div className="p-6 rounded-2xl bg-white/90 border border-emerald-200/80 text-center flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="text-left">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-pink-600" />
              How YouTube Playlists become Daily Sessions
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              StudyNest takes any long playlist and chunks it into 50–70 min daily sessions while keeping the original video order.
            </p>
          </div>
          <button
            onClick={onStartCreatePlan}
            className="px-5 py-2.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-900 text-xs font-bold transition-all shrink-0 flex items-center gap-2 shadow-2xs"
          >
            <Play className="w-3.5 h-3.5 text-emerald-700 fill-emerald-700" />
            <span>Create New Plan Now</span>
          </button>
        </div>
      </section>
    </div>
  );
};

