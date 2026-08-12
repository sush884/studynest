import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  Calendar,
  Users,
  FileText,
  BarChart2,
  Settings,
  Flame,
  Sparkles,
  Youtube,
  GraduationCap,
  Trophy
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  userStreak: number;
  openCreateModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  userStreak,
  openCreateModal,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'plans', label: 'My Study Plans', icon: BookOpen },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'stats', label: 'Analytics & Goals', icon: BarChart2 },
    { id: 'groups', label: 'Study Groups', icon: Users, badge: 'Python 🐍' },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white/95 backdrop-blur-md border-r border-pink-100/80 text-slate-700 flex flex-col h-screen sticky top-0 shrink-0 z-30 select-none shadow-sm">
      {/* Brand Header */}
      <div className="p-5 border-b border-pink-100/80 flex items-center justify-between">
        <div 
          onClick={() => setCurrentTab('landing')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-400 to-amber-400 flex items-center justify-center text-white shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-lg tracking-tight flex items-center gap-1.5">
              StudyNest
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-200">
                v2.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium truncate max-w-[130px]">
              Learn Together
            </p>
          </div>
        </div>
      </div>

      {/* Streak Banner (Light Yellow / Amber Highlight) */}
      <div className="mx-4 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-200/60 flex items-center justify-center text-amber-700">
            <Flame className="w-5 h-5 fill-amber-500 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">Daily Streak</p>
            <p className="text-sm font-extrabold text-amber-700">{userStreak} Days Active 🔥</p>
          </div>
        </div>
      </div>

      {/* Create Plan Quick CTA (Light Pink / Rose Highlight) */}
      <div className="p-4">
        <button
          onClick={openCreateModal}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:opacity-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-pink-500/20 active:scale-[0.98] transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Study Plan</span>
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl font-medium text-sm flex items-center justify-between transition-all ${
                isActive
                  ? 'bg-pink-100/80 text-pink-800 font-bold border border-pink-200/80 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-pink-50/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-pink-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Tagline */}
      <div className="p-4 border-t border-pink-100/80 bg-pink-50/40 text-xs text-slate-500">
        <div className="flex items-center gap-2 text-slate-800 font-bold mb-1">
          <Youtube className="w-4 h-4 text-pink-600" />
          <span>Learn 1h a day.</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Turn long YouTube playlists into consistent daily habits.
        </p>
      </div>
    </aside>
  );
};
