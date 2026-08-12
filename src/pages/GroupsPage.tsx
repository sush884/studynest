import React, { useState, useEffect } from 'react';
import { StudyGroup, User, StudyDay, DayVideo } from '../types';
import { api } from '../services/api';
import {
  Users,
  Plus,
  UserPlus,
  Copy,
  Check,
  Flame,
  Share2,
  Sparkles,
  MessageSquare,
  Send,
  BookOpen,
  Settings,
  Shield,
  Activity,
  LogOut,
  Trash2,
  ExternalLink,
  CheckCircle2,
  PlayCircle,
  Clock,
  Target,
  BarChart3,
  Archive,
  Info,
  Trophy
} from 'lucide-react';
import { GroupChatRoom } from '../components/group/GroupChatRoom';
import { GroupAnalyticsTab } from '../components/group/GroupAnalyticsTab';
import { GroupLeaderboardTab } from '../components/group/GroupLeaderboardTab';

export const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'leaderboard' | 'plan' | 'members' | 'settings' | 'chat'>('overview');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Form states
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupTarget, setNewGroupTarget] = useState('60');
  const [newGroupReq, setNewGroupReq] = useState('60');
  const [newGroupPlaylistUrl, setNewGroupPlaylistUrl] = useState('');

  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Settings form states
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTarget, setEditTarget] = useState('60');
  const [editReq, setEditReq] = useState('60');

  // Set plan form state
  const [planPlaylistUrl, setPlanPlaylistUrl] = useState('');
  const [planTarget, setPlanTarget] = useState('60');
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

  // Discussion state
  const [discussionLearned, setDiscussionLearned] = useState('');
  const [discussionDoubt, setDiscussionDoubt] = useState('');

  const loadGroups = async () => {
    try {
      const u = await api.getCurrentUser();
      setCurrentUser(u);
      const gList = await api.getGroups();
      setGroups(gList);
      if (gList.length > 0 && !selectedGroupId) {
        setSelectedGroupId(gList[0].id);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const activeGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  const isOwner = activeGroup && currentUser ? activeGroup.ownerId === currentUser.id : false;

  useEffect(() => {
    if (activeGroup) {
      setEditName(activeGroup.name);
      setEditDesc(activeGroup.description || '');
      setEditTarget(String(activeGroup.dailyTargetMinutes || 60));
      setEditReq(String(activeGroup.requiredParticipationPercent || 60));
    }
  }, [activeGroup?.id]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const g = await api.createGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || undefined,
        dailyTargetMinutes: Number(newGroupTarget),
        requiredParticipationPercent: Number(newGroupReq),
        playlistUrl: newGroupPlaylistUrl.trim() || undefined,
      });
      setGroups((prev) => [g, ...prev]);
      setSelectedGroupId(g.id);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupTarget('60');
      setNewGroupReq('60');
      setNewGroupPlaylistUrl('');
      setShowCreateModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const g = await api.joinGroup(joinCode.trim());
      setGroups((prev) => [g, ...prev.filter((item) => item.id !== g.id)]);
      setSelectedGroupId(g.id);
      setJoinCode('');
      setShowJoinModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !isOwner) return;
    try {
      const updated = await api.updateGroupSettings(activeGroup.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        dailyTargetMinutes: Number(editTarget),
        requiredParticipationPercent: Number(editReq),
      });
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      alert('Group settings saved successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    }
  };

  const handleSetStudyPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !planPlaylistUrl.trim()) return;
    setIsSubmittingPlan(true);
    try {
      const updated = await api.setGroupStudyPlan(activeGroup.id, planPlaylistUrl.trim(), Number(planTarget));
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setPlanPlaylistUrl('');
      alert('Shared Group Study Plan updated!');
    } catch (err: any) {
      alert(err.message || 'Failed to set study plan');
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup) return;
    if (window.confirm(`Are you sure you want to leave ${activeGroup.name}?`)) {
      try {
        await api.leaveGroup(activeGroup.id);
        const remaining = groups.filter((g) => g.id !== activeGroup.id);
        setGroups(remaining);
        setSelectedGroupId(remaining.length > 0 ? remaining[0].id : null);
      } catch (err: any) {
        alert(err.message || 'Failed to leave group');
      }
    }
  };

  const handleDeleteGroup = async (archive = false) => {
    if (!activeGroup || !isOwner) return;
    const actionText = archive ? 'archive' : 'permanently delete';
    if (window.confirm(`Are you sure you want to ${actionText} ${activeGroup.name}?`)) {
      try {
        await api.deleteGroup(activeGroup.id, archive);
        const remaining = groups.filter((g) => g.id !== activeGroup.id);
        setGroups(remaining);
        setSelectedGroupId(remaining.length > 0 ? remaining[0].id : null);
      } catch (err: any) {
        alert(err.message || 'Failed to delete group');
      }
    }
  };

  const handleMarkVideoWatched = async (videoId: string, completed: boolean) => {
    if (!activeGroup) return;
    try {
      await api.markVideoComplete(videoId, activeGroup.studyPlanId, completed);
      const updatedGroup = await api.getGroup(activeGroup.id);
      setGroups((prev) => prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostDiscussion = async (groupId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!discussionLearned.trim()) return;

    try {
      await api.postDailyDiscussion(groupId, {
        dayNumber: 1,
        learnedToday: discussionLearned.trim(),
        difficulty: 'medium',
        doubtQuestion: discussionDoubt.trim() || undefined,
      });
      setDiscussionLearned('');
      setDiscussionDoubt('');

      const updatedG = await api.getGroup(groupId);
      setGroups((prev) => prev.map((item) => (item.id === groupId ? updatedG : item)));
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Group Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-pink-100 shadow-xs">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-pink-600" />
            <span>Group Study Hub</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">Study together with friends, track daily group goals, and maintain your group streak</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJoinModal(true)}
            className="px-4 py-2 bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200 text-xs font-bold rounded-2xl transition flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Join Group</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-2xl shadow-xs transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Group</span>
          </button>
        </div>
      </div>

      {/* Group Selector Tabs (Supports Multiple Groups) */}
      {groups.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {groups.map((g) => {
            const isSelected = selectedGroupId === g.id;
            return (
              <button
                key={g.id}
                onClick={() => {
                  setSelectedGroupId(g.id);
                  setActiveTab('overview');
                }}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition shrink-0 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white border border-pink-100 text-slate-700 hover:bg-pink-50'
                }`}
              >
                <span>{g.name}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-black flex items-center gap-0.5">
                  <Flame className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {g.groupStreak}d
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Active Group View */}
      {activeGroup ? (
        <div className="space-y-6">
          {/* Active Group Hero Header Card */}
          <div className="bg-gradient-to-br from-pink-500 via-pink-600 to-rose-600 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Users className="w-64 h-64 text-white" />
            </div>

            <div className="relative z-10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl md:text-2xl font-black">{activeGroup.name}</h2>
                    {isOwner && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-amber-300 fill-amber-300" /> Owner/Admin
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/30 text-emerald-100 border border-emerald-300/30 uppercase tracking-wider">
                      {activeGroup.status}
                    </span>
                  </div>
                  {activeGroup.description && (
                    <p className="text-xs text-pink-100 max-w-xl">{activeGroup.description}</p>
                  )}
                </div>

                {/* Invite Code Widget */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl flex items-center gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-pink-200 uppercase tracking-wider">Group Invite Code</p>
                    <p className="text-sm font-mono font-black tracking-widest text-white">{activeGroup.inviteCode}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(activeGroup.inviteCode, 'code')}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition text-xs font-bold flex items-center gap-1 shrink-0"
                    title="Copy Invite Code"
                  >
                    {copiedCode === 'code' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode === 'code' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Shared Curriculum Title Banner */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/20 text-xs">
                <div className="flex items-center gap-2 text-pink-100">
                  <BookOpen className="w-4 h-4 text-amber-300" />
                  <span className="font-bold">Course:</span>
                  <span className="font-black text-white">{activeGroup.studyPlanTitle}</span>
                </div>

                <div className="flex items-center gap-4 text-pink-100 text-[11px]">
                  <span>🎯 Daily Goal: <strong>{activeGroup.dailyTargetMinutes} mins</strong></span>
                  <span>📊 Required Participation: <strong>{activeGroup.requiredParticipationPercent}%</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center border-b border-pink-100 gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                activeTab === 'overview'
                  ? 'border-pink-500 text-pink-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                activeTab === 'analytics'
                  ? 'border-pink-500 text-pink-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Group Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-4 py-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                activeTab === 'leaderboard'
                  ? 'border-pink-500 text-pink-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Leaderboard</span>
            </button>

            <button
              onClick={() => setActiveTab('plan')}
              className={`px-4 py-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                activeTab === 'plan'
                  ? 'border-pink-500 text-pink-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Group Study Plan</span>
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                activeTab === 'members'
                  ? 'border-pink-500 text-pink-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Members ({activeGroup.members.length})</span>
            </button>

            {isOwner && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                  activeTab === 'settings'
                    ? 'border-pink-500 text-pink-600 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Group Settings</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 relative ${
                activeTab === 'chat'
                  ? 'border-pink-500 text-pink-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat Room</span>
              {activeGroup.unreadCount !== undefined && activeGroup.unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-pink-500 text-white rounded-full">
                  {activeGroup.unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-amber-700">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Group Streak</span>
                    <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
                  </div>
                  <p className="text-2xl font-black text-amber-900">{activeGroup.groupStreak} Days</p>
                  <p className="text-[10px] text-amber-700 font-medium">Date-based goal completion</p>
                </div>

                <div className="p-4 rounded-2xl bg-pink-50/70 border border-pink-200/60 text-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-pink-700">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Today's Participation</span>
                    <Target className="w-4 h-4 text-pink-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-900">
                    {activeGroup.completedMembersTodayCount} / {activeGroup.totalMembersCount}
                    <span className="text-xs font-bold text-pink-600 ml-1.5">({activeGroup.todayParticipationPercent}%)</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">Req: {activeGroup.requiredParticipationPercent}% to keep streak</p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/60 text-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-blue-700">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Group Hours</span>
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-900">
                    {(activeGroup.totalGroupStudyMinutes / 60).toFixed(1)} hrs
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">Combined member study time</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 text-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-emerald-700">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Avg Course Progress</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-900">{activeGroup.averageMemberProgressPercent}%</p>
                  <p className="text-[10px] text-slate-500 font-medium">Across all members</p>
                </div>
              </div>

              {/* Goal Status Banner */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                activeGroup.todayParticipationPercent >= activeGroup.requiredParticipationPercent
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    activeGroup.todayParticipationPercent >= activeGroup.requiredParticipationPercent
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-500 text-white'
                  }`}>
                    {activeGroup.todayParticipationPercent >= activeGroup.requiredParticipationPercent ? '🎉' : '⏳'}
                  </div>
                  <div>
                    <p className="text-xs font-black">
                      {activeGroup.todayParticipationPercent >= activeGroup.requiredParticipationPercent
                        ? 'Today’s Participation Target Achieved!'
                        : 'Group Daily Goal In Progress'}
                    </p>
                    <p className="text-[11px] opacity-90">
                      {activeGroup.todayParticipationPercent >= activeGroup.requiredParticipationPercent
                        ? `The group reached ${activeGroup.todayParticipationPercent}% participation today! Group streak is active.`
                        : `${activeGroup.completedMembersTodayCount} of ${activeGroup.totalMembersCount} members completed today’s goal. Need ${activeGroup.requiredParticipationPercent}% to secure today's streak.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Member Progress Cards */}
              <div className="bg-white p-5 rounded-3xl border border-pink-100 space-y-4">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Member Progress Breakdown
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeGroup.members.map((m) => (
                    <div
                      key={m.userId}
                      className={`p-4 rounded-2xl border space-y-3 ${
                        m.completedToday
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-slate-50/70 border-slate-200 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-pink-500 text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-xs">
                            {m.userName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-black text-slate-900 truncate">{m.userName}</p>
                              {m.role === 'owner' && (
                                <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md">Admin</span>
                              )}
                            </div>
                            <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                              <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                              {m.streak}d personal streak
                            </p>
                          </div>
                        </div>

                        <div>
                          {m.completedToday ? (
                            <span className="px-2.5 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full shadow-xs">
                              ✓ Goal Met
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-full">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Course Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                          <span>Course Completion</span>
                          <span>{m.courseProgressPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-pink-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${m.courseProgressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Timeline */}
              {activeGroup.activities && activeGroup.activities.length > 0 && (
                <div className="bg-white p-5 rounded-3xl border border-pink-100 space-y-3">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-pink-600" />
                    <span>Recent Group Activity</span>
                  </h3>

                  <div className="space-y-2">
                    {activeGroup.activities.map((act) => (
                      <div key={act.id} className="p-3 rounded-xl bg-pink-50/40 border border-pink-100/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                          <span className="text-slate-800 font-medium">{act.description}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GROUP ANALYTICS */}
          {activeTab === 'analytics' && (
            <GroupAnalyticsTab groupId={activeGroup.id} />
          )}

          {/* TAB 3: GROUP LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <GroupLeaderboardTab groupId={activeGroup.id} />
          )}

          {/* TAB 4: STUDY PLAN / SHARED CURRICULUM */}
          {activeTab === 'plan' && (
            <div className="space-y-6">
              {activeGroup.studyPlan ? (
                <div className="bg-white p-6 rounded-3xl border border-pink-100 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-pink-100">
                    <div>
                      <h3 className="text-base font-black text-slate-900">{activeGroup.studyPlan.title}</h3>
                      <p className="text-xs text-slate-500">
                        Channel: {activeGroup.studyPlan.channelTitle || 'YouTube'} • {activeGroup.studyPlan.totalVideos} videos • {activeGroup.studyPlan.totalDurationFormatted}
                      </p>
                    </div>

                    {isOwner && (
                      <button
                        onClick={() => {
                          const url = prompt('Enter new YouTube Playlist URL for Group:');
                          if (url) {
                            api.setGroupStudyPlan(activeGroup.id, url)
                              .then((updated) => setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g))))
                              .catch((err) => alert(err.message));
                          }
                        }}
                        className="px-3.5 py-1.5 bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200 text-xs font-bold rounded-xl transition"
                      >
                        Change Curriculum
                      </button>
                    )}
                  </div>

                  {/* Study Days & Videos */}
                  <div className="space-y-4">
                    {activeGroup.studyPlan.days?.map((day) => (
                      <div key={day.id} className="p-4 rounded-2xl bg-pink-50/30 border border-pink-100 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-900">
                            Day {day.dayNumber}: {day.title}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">{day.totalDurationFormatted}</span>
                        </div>

                        <div className="space-y-2">
                          {day.videos?.map((dv) => {
                            const isWatched = Boolean(dv.completed || dv.video?.completed);
                            return (
                              <div
                                key={dv.id}
                                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  isWatched ? 'bg-emerald-50/80 border-emerald-200' : 'bg-white border-pink-100'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {dv.video?.thumbnailUrl && (
                                    <img
                                      src={dv.video.thumbnailUrl}
                                      alt=""
                                      className="w-16 h-10 object-cover rounded-lg shrink-0 border border-pink-100"
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">{dv.video?.title || dv.id}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">{dv.video?.durationFormatted}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <a
                                    href={dv.video?.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Watch</span>
                                  </a>

                                  <button
                                    onClick={() => handleMarkVideoWatched(dv.videoId || dv.video?.id || dv.id, !isWatched)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1 ${
                                      isWatched
                                        ? 'bg-emerald-500 text-white shadow-xs'
                                        : 'bg-pink-500 text-white hover:bg-pink-600'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>{isWatched ? 'Watched' : 'Mark Watched'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-3xl border border-pink-100 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center mx-auto">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">No Shared Study Plan Set Yet</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      {isOwner
                        ? 'Paste a YouTube Playlist URL below to generate a shared group curriculum.'
                        : 'The group admin has not assigned a YouTube study plan yet.'}
                    </p>
                  </div>

                  {isOwner && (
                    <form onSubmit={handleSetStudyPlan} className="max-w-md mx-auto space-y-3 pt-2 text-left">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">YouTube Playlist URL</label>
                        <input
                          type="url"
                          required
                          value={planPlaylistUrl}
                          onChange={(e) => setPlanPlaylistUrl(e.target.value)}
                          placeholder="https://www.youtube.com/playlist?list=..."
                          className="w-full px-3.5 py-2.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingPlan}
                        className="w-full py-2.5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-xl shadow-xs transition"
                      >
                        {isSubmittingPlan ? 'Analyzing Playlist...' : 'Generate Group Curriculum'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MEMBERS */}
          {activeTab === 'members' && (
            <div className="bg-white p-6 rounded-3xl border border-pink-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Real Group Members ({activeGroup.members.length})
                </h3>

                {!isOwner && (
                  <button
                    onClick={handleLeaveGroup}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Leave Group</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeGroup.members.map((m) => (
                  <div key={m.userId} className="p-4 rounded-2xl bg-pink-50/30 border border-pink-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pink-500 text-white font-black flex items-center justify-center text-sm shadow-xs">
                        {m.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-slate-900">{m.userName}</p>
                          {m.role === 'owner' && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md">Admin</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">{m.userEmail}</p>
                      </div>
                    </div>

                    <div className="text-right text-[11px] font-bold text-amber-700">
                      🔥 {m.streak}d streak
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS (ADMIN ONLY) */}
          {activeTab === 'settings' && isOwner && (
            <div className="bg-white p-6 rounded-3xl border border-pink-100 space-y-6">
              <h3 className="text-sm font-black text-slate-900">Manage Group Settings</h3>

              <form onSubmit={handleUpdateSettings} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Group Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Daily Study Target</label>
                    <select
                      value={editTarget}
                      onChange={(e) => setEditTarget(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                    >
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                      <option value="90">90 minutes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Required Participation (%)</label>
                    <select
                      value={editReq}
                      onChange={(e) => setEditReq(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                    >
                      <option value="50">50%</option>
                      <option value="60">60%</option>
                      <option value="75">75%</option>
                      <option value="100">100%</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Save Settings
                </button>
              </form>

              <div className="pt-6 border-t border-pink-100 flex items-center gap-3">
                <button
                  onClick={() => handleDeleteGroup(true)}
                  className="px-4 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <Archive className="w-4 h-4" />
                  <span>Archive Group</span>
                </button>

                <button
                  onClick={() => handleDeleteGroup(false)}
                  className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Group</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: CHAT ROOM */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Real-time WebSocket chat room is active for this group. Advanced chat threads and channels will be expanded in Step 5.</span>
              </div>

              <GroupChatRoom
                groupId={activeGroup.id}
                currentUserId={currentUser?.id || 'user_1'}
                groupMembers={activeGroup.members}
                groupOwnerId={activeGroup.ownerId}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-pink-100 text-center space-y-4">
          <Users className="w-12 h-12 text-pink-500 mx-auto" />
          <h2 className="text-lg font-black text-slate-900">No Study Groups Joined Yet</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Create a group or join an existing group with an invite code to start studying together.</p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2 bg-pink-50 text-pink-700 text-xs font-bold rounded-xl border border-pink-200"
            >
              Join Group
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-pink-500 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Create Group
            </button>
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-pink-200 rounded-3xl p-6 text-slate-800 space-y-4 shadow-xl">
            <h3 className="text-base font-black text-slate-900">Create New Study Group</h3>
            {errorMsg && <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl font-bold">{errorMsg}</p>}

            <form onSubmit={handleCreateGroup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Group Name *</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Python Warriors 🐍"
                  className="w-full px-3.5 py-2.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="e.g. Learning Python together every day!"
                  className="w-full px-3.5 py-2.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Daily Target</label>
                  <select
                    value={newGroupTarget}
                    onChange={(e) => setNewGroupTarget(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="30">30 mins</option>
                    <option value="45">45 mins</option>
                    <option value="60">60 mins</option>
                    <option value="90">90 mins</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Participation Req.</label>
                  <select
                    value={newGroupReq}
                    onChange={(e) => setNewGroupReq(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="50">50%</option>
                    <option value="60">60%</option>
                    <option value="75">75%</option>
                    <option value="100">100%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">YouTube Playlist URL (Optional)</label>
                <input
                  type="url"
                  value={newGroupPlaylistUrl}
                  onChange={(e) => setNewGroupPlaylistUrl(e.target.value)}
                  placeholder="https://www.youtube.com/playlist?list=..."
                  className="w-full px-3.5 py-2.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-pink-50 text-slate-700 text-xs font-bold rounded-xl border border-pink-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {loading ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN GROUP MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-pink-200 rounded-3xl p-6 text-slate-800 space-y-4 shadow-xl">
            <h3 className="text-base font-black text-slate-900">Join Study Group</h3>
            {errorMsg && <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl font-bold">{errorMsg}</p>}

            <form onSubmit={handleJoinGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Enter Group Code</label>
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. PYW5829"
                  className="w-full px-4 py-2.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-slate-800 uppercase focus:outline-none focus:border-pink-500 font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 bg-pink-50 text-slate-700 text-xs font-bold rounded-xl border border-pink-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {loading ? 'Joining...' : 'Join Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
