import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Trophy,
  Award,
  Zap,
  Flame,
  Star,
  CheckCircle2,
  Lock,
  Sparkles,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

export const AchievementsPage: React.FC = () => {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [gamification, setGamification] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [achList, gameData] = await Promise.all([
        api.getAchievements(),
        api.getGamificationData(),
      ]);
      setAchievements(achList);
      setGamification(gameData);
    } catch (err) {
      console.error('Failed to load achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalCount = achievements.length;
  const unlockPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        <Sparkles className="w-8 h-8 text-pink-500 animate-spin mx-auto mb-2" />
        <p>Loading achievements & XP stats...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 select-none">
      {/* Header & Level Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            <span>Achievements & XP Level</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Earn XP for completed videos and milestones to level up your study rank
          </p>
        </div>

        {/* Level Badge */}
        {gamification && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white shadow-md flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl border border-white/30">
              Lvl {gamification.level}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-pink-100">Study Rank</p>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  {gamification.totalXP} XP Total
                </span>
              </div>
              <div className="w-36 h-2 rounded-full bg-black/20 overflow-hidden mt-1.5 border border-white/20">
                <div
                  className="h-full bg-amber-300 rounded-full transition-all duration-500"
                  style={{ width: `${gamification.levelProgressPercent}%` }}
                ></div>
              </div>
              <p className="text-[10px] font-semibold text-pink-100 mt-1">
                {gamification.xpToNextLevel} XP to Level {gamification.level + 1}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Progress Overview Card */}
      <div className="p-6 rounded-3xl bg-white/95 border border-pink-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-pink-600" />
            <h2 className="text-sm font-black text-slate-900">Achievement Progress</h2>
          </div>
          <span className="text-xs font-black text-pink-700 bg-pink-100/80 px-3 py-1 rounded-full border border-pink-200">
            {unlockedCount} / {totalCount} Unlocked ({unlockPercent}%)
          </span>
        </div>

        {/* Global Progress bar */}
        <div className="w-full h-3 rounded-full bg-pink-100/60 overflow-hidden border border-pink-200/80">
          <div
            className="h-full bg-gradient-to-r from-pink-500 via-amber-400 to-emerald-500 transition-all duration-700"
            style={{ width: `${unlockPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((ach) => {
          const isUnlocked = ach.isUnlocked;
          const reqVal = ach.requirementValue;
          const currVal = ach.currentValue || 0;
          const progressPercent = reqVal > 0 ? Math.min(100, Math.round((currVal / reqVal) * 100)) : 0;

          return (
            <div
              key={ach.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                isUnlocked
                  ? 'bg-gradient-to-br from-emerald-50/90 via-white to-pink-50/40 border-emerald-300 shadow-sm'
                  : 'bg-white/80 border-slate-200 opacity-90'
              }`}
            >
              {/* Unlocked banner tag */}
              {isUnlocked && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-bl-xl shadow-xs flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Unlocked
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs border ${
                      isUnlocked
                        ? 'bg-amber-100/90 border-amber-300 text-amber-700'
                        : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}
                  >
                    {ach.icon || '🏆'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <span>{ach.name}</span>
                      {!isUnlocked && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium leading-snug">
                      {ach.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress or Unlock Timestamp Footer */}
              <div className="pt-3 border-t border-slate-100 mt-2">
                {isUnlocked ? (
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Completed
                    </span>
                    <span className="text-slate-400 font-medium text-[10px]">
                      {ach.unlockedAt ? new Date(ach.unlockedAt).toLocaleDateString() : 'Unlocked'}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold text-slate-600">
                      <span>Progress</span>
                      <span>
                        {currVal} / {reqVal}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                      <div
                        className="h-full bg-gradient-to-r from-pink-400 to-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent XP History */}
      {gamification?.recentTransactions?.length > 0 && (
        <div className="p-6 rounded-3xl bg-white/95 border border-pink-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-black text-slate-900">Recent XP Earnings</h2>
          </div>

          <div className="divide-y divide-pink-50">
            {gamification.recentTransactions.map((tx: any) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center">
                    +{tx.amount}
                  </span>
                  <span className="font-semibold text-slate-800">{tx.reason}</span>
                </div>
                <span className="text-[10px] font-medium text-slate-400">
                  {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
