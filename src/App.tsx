import React, { useState, useEffect } from 'react';
import { StudyPlan, StudyDay, User } from './types';
import { api } from './services/api';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { OfflineBanner } from './components/OfflineBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CreatePlanModal } from './components/plan/CreatePlanModal';
import { PlanDetailModal } from './components/plan/PlanDetailModal';
import { AuthModal } from './components/auth/AuthModal';

import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudyPlansPage } from './pages/StudyPlansPage';
import { StudyPlayerPage } from './pages/StudyPlayerPage';
import { CalendarPage } from './pages/CalendarPage';
import { GroupsPage } from './pages/GroupsPage';
import { NotesPage } from './pages/NotesPage';
import { StatsPage } from './pages/StatsPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [todaySession, setTodaySession] = useState<StudyDay | null>(null);
  const [stats, setStats] = useState<any>(null);

  const [playerPlan, setPlayerPlan] = useState<StudyPlan | null>(null);
  const [playerDay, setPlayerDay] = useState<StudyDay | null>(null);
  const [playerVideoIndex, setPlayerVideoIndex] = useState<number>(0);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailPlan, setDetailPlan] = useState<StudyPlan | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('signup');

  // Load current user and application data
  const refreshData = async () => {
    try {
      const u = await api.getCurrentUser();
      setUser(u);

      const pList = await api.getStudyPlans();
      setPlans(pList);

      const dash = await api.getDashboardData();
      setActivePlan(dash.activePlan || null);
      setTodaySession(dash.todaySession || null);
      setStats(dash.stats || null);
    } catch (err) {
      console.log('User not logged in or token expired:', err);
      setUser(null);
    } finally {
      setAuthChecking(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSelectDayForPlayer = (day: StudyDay, plan: StudyPlan, videoIndex: number = 0) => {
    setPlayerPlan(plan);
    setPlayerDay(day);
    setPlayerVideoIndex(videoIndex);
    setCurrentTab('player');
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await api.deleteStudyPlan(planId);
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlanCreated = (newPlan: StudyPlan) => {
    setPlans((prev) => [newPlan, ...prev]);
    setActivePlan(newPlan);
    if (newPlan.days.length > 0) {
      setTodaySession(newPlan.days[0]);
    }
    refreshData();
  };

  const handleAuthSuccess = (loggedUser: User) => {
    setUser(loggedUser);
    setIsAuthModalOpen(false);
    refreshData();
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setPlans([]);
    setActivePlan(null);
    setTodaySession(null);
    setStats(null);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center space-y-3 select-none">
          <div className="w-12 h-12 rounded-2xl bg-pink-500 flex items-center justify-center text-2xl mx-auto animate-bounce shadow-lg">
            🪹
          </div>
          <h2 className="text-lg font-bold">Loading StudyNest...</h2>
          <p className="text-xs text-slate-400">Verifying secure multi-user session</p>
        </div>
      </div>
    );
  }

  // Unauthenticated user -> Show Landing / Auth Flow
  if (!user) {
    return (
      <ErrorBoundary>
        <OfflineBanner />
        <LandingPage
          onSelectSelfStudy={() => {
            setAuthModalMode('signup');
            setIsAuthModalOpen(true);
          }}
          onSelectGroupStudy={() => {
            setAuthModalMode('signup');
            setIsAuthModalOpen(true);
          }}
          onStartCreatePlan={() => {
            setAuthModalMode('signup');
            setIsAuthModalOpen(true);
          }}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
          initialMode={authModalMode}
        />
      </ErrorBoundary>
    );
  }

  // Study Video Player View
  if (currentTab === 'player' && playerPlan && playerDay) {
    return (
      <ErrorBoundary>
        <OfflineBanner />
        <StudyPlayerPage
          plan={playerPlan}
          day={playerDay}
          initialVideoIndex={playerVideoIndex}
          onBackToDashboard={() => setCurrentTab('dashboard')}
          onPlanUpdated={refreshData}
        />
      </ErrorBoundary>
    );
  }

  // Authenticated Main Workspace Layout
  return (
    <ErrorBoundary>
      <OfflineBanner />
      <div className="min-h-screen bg-gradient-to-br from-pink-50/80 via-amber-50/50 to-emerald-50/80 text-slate-900 flex font-sans antialiased selection:bg-pink-500 selection:text-white">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          userStreak={user.currentStreak || 0}
          openCreateModal={() => setIsCreateModalOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            user={user}
            onOpenCreate={() => setIsCreateModalOpen(true)}
            onTabChange={setCurrentTab}
            onLogout={handleLogout}
          />

          <main className="flex-1 overflow-y-auto">
            {currentTab === 'dashboard' && (
              <DashboardPage
                user={user}
                activePlan={activePlan}
                todaySession={todaySession}
                stats={stats}
                onSelectDay={handleSelectDayForPlayer}
                onOpenCreate={() => setIsCreateModalOpen(true)}
                onViewPlans={() => setCurrentTab('plans')}
                onViewGroups={() => setCurrentTab('groups')}
                onPlanUpdated={refreshData}
              />
            )}

            {currentTab === 'plans' && (
              <StudyPlansPage
                plans={plans}
                onOpenPlan={(plan) => setDetailPlan(plan)}
                onOpenCreate={() => setIsCreateModalOpen(true)}
                onDeletePlan={handleDeletePlan}
              />
            )}

            {currentTab === 'calendar' && <CalendarPage />}

            {currentTab === 'achievements' && <AchievementsPage />}

            {currentTab === 'groups' && <GroupsPage />}

            {currentTab === 'notes' && <NotesPage />}

            {currentTab === 'stats' && <StatsPage />}

            {currentTab === 'settings' && (
              <SettingsPage
                user={user}
                onUserUpdated={(updated) => setUser(updated)}
                onLogout={handleLogout}
              />
            )}
          </main>
        </div>

        {/* Mobile Navigation Bar */}
        <MobileNav currentTab={currentTab} setCurrentTab={setCurrentTab} />

        {/* Create Plan Dialog Modal */}
        <CreatePlanModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onPlanCreated={handlePlanCreated}
        />

        {/* Plan Roadmap Detail Modal */}
        {detailPlan && (
          <PlanDetailModal
            plan={detailPlan}
            isOpen={Boolean(detailPlan)}
            onClose={() => setDetailPlan(null)}
            onSelectDay={handleSelectDayForPlayer}
            onPlanUpdated={refreshData}
            onDeletePlan={handleDeletePlan}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

