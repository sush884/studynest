import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart2,
  Trophy,
  Settings,
} from 'lucide-react';

interface Props {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const MobileNav: React.FC<Props> = ({ currentTab, setCurrentTab }) => {
  const items = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'plans', label: 'Study', icon: BookOpen },
    { id: 'groups', label: 'Groups', icon: Users },
    { id: 'stats', label: 'Analytics', icon: BarChart2 },
    { id: 'achievements', label: 'Trophies', icon: Trophy },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-pink-200 z-40 px-2 py-1.5 shadow-lg select-none">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-extrabold transition-all ${
                isActive
                  ? 'text-pink-600 bg-pink-50/80 scale-105'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
