import React, { useState } from 'react';
import { User } from '../../types';
import { Flame, Sparkles, LogOut, BellRing } from 'lucide-react';
import { NotificationCenter } from '../NotificationCenter';
import { StudyReminderModal } from '../StudyReminderModal';

interface HeaderProps {
  user: User;
  onOpenCreate: () => void;
  onTabChange: (tab: string) => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onTabChange, onLogout }) => {
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

  return (
    <>
      <header className="h-16 border-b border-pink-100/80 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-extrabold text-slate-800 tracking-tight hidden sm:block">
            Welcome back, <span className="text-pink-600">{user.name.split(' ')[0]}</span> 👋
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Daily Reminder Settings Button */}
          <button
            onClick={() => setIsReminderModalOpen(true)}
            className="p-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200/60 text-slate-700 transition-colors relative"
            title="Configure Daily Study Reminders"
          >
            <BellRing className="w-4 h-4 text-pink-600" />
          </button>

          {/* Real-Time Notification Center Dropdown */}
          <NotificationCenter onSelectGroup={() => onTabChange('groups')} />

          {/* Streak Pill (Yellow) */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300/80 text-xs font-bold text-amber-800 shadow-2xs">
            <Flame className="w-4 h-4 fill-amber-500 text-amber-600" />
            <span>{user.currentStreak || 0} Day Streak</span>
          </div>

          {/* AI Enabled Pill (Green) */}
          <button
            onClick={() => onTabChange('settings')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300/80 text-xs font-bold text-emerald-800 hover:bg-emerald-200/70 transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Gemini AI Active</span>
          </button>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-100">
            <div
              onClick={() => onTabChange('settings')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white font-bold text-sm flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-800 group-hover:text-pink-600 transition-colors">
                  {user.name}
                </p>
                <p className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                  {user.email}
                </p>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Log Out"
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Daily Study Reminder Configuration Modal */}
      <StudyReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
      />
    </>
  );
};
