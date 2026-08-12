import { StudyPlan, User, Note, StudyGroup, UserStats, PracticeQuestion, YouTubePlaylistMeta, ChatMessage, Friend, Bookmark, Achievement, DailyDiscussion, LiveStudyStatus, AppNotification, StudyReminderSetting } from '../types';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('studynest_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth
  async signup(data: { name: string; email: string; password: string }): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Signup failed');
    }
    const result = await res.json();
    if (result.token) localStorage.setItem('studynest_auth_token', result.token);
    return result;
  },

  async login(data: { email: string; password: string }): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const result = await res.json();
    if (result.token) localStorage.setItem('studynest_auth_token', result.token);
    return result;
  },

  async getCurrentUser(): Promise<User> {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error('Not authenticated');
    }
    return res.json();
  },

  logout() {
    localStorage.removeItem('studynest_auth_token');
  },

  // Profile
  async getProfile(): Promise<User> {
    const res = await fetch('/api/user/profile', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load profile');
    return res.json();
  },

  async updateProfile(name: string, email: string, bio?: string): Promise<User> {
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, email, bio }),
    });
    return res.json();
  },

  // Analyze Playlist
  async analyzePlaylist(playlistUrl: string, demoKey?: string): Promise<YouTubePlaylistMeta> {
    const res = await fetch('/api/playlists/analyze', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ playlistUrl, demoKey }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to analyze playlist');
    }
    return res.json();
  },

  // Create Study Plan
  async createStudyPlan(params: {
    title: string;
    description?: string;
    playlistUrl: string;
    playlistId: string;
    channelTitle?: string;
    thumbnailUrl?: string;
    dailyTargetMinutes: number;
    flexibility: 'strict' | 'flexible';
    allowVideoSplitting: boolean;
    videos: any[];
  }): Promise<StudyPlan> {
    const res = await fetch('/api/study-plans', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create study plan');
    }
    return res.json();
  },

  // Get Plans
  async getStudyPlans(): Promise<StudyPlan[]> {
    const res = await fetch('/api/study-plans', { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async getStudyPlan(id: string): Promise<StudyPlan> {
    const res = await fetch(`/api/study-plans/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Plan not found');
    return res.json();
  },

  async updateStudyPlan(
    id: string,
    params: { title?: string; dailyTargetMinutes?: number; status?: string }
  ): Promise<StudyPlan> {
    const res = await fetch(`/api/study-plans/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to update study plan');
    return res.json();
  },

  async deleteStudyPlan(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/study-plans/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    return res.json();
  },

  // Start Watching Video
  async startWatchVideo(videoId: string, planId?: string) {
    const res = await fetch(`/api/videos/${videoId}/start-watch`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ planId }),
    });
    return res.json();
  },

  // Mark Video Complete
  async markVideoComplete(videoId: string, planId?: string, completed = true) {
    const res = await fetch(`/api/videos/${videoId}/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ completed, planId }),
    });
    return res.json();
  },

  // Mark Day Complete
  async markDayComplete(dayId: string, completed = true) {
    const res = await fetch(`/api/days/${dayId}/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ completed }),
    });
    return res.json();
  },

  // Dashboard
  async getDashboardData() {
    const res = await fetch('/api/dashboard', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch dashboard data');
    return res.json();
  },

  // Notes
  async getNotes(): Promise<Note[]> {
    const res = await fetch('/api/notes', { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async createNote(note: {
    videoTitle?: string;
    dayNumber?: number;
    content: string;
    studyPlanId?: string;
    videoId?: string;
  }): Promise<Note> {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(note),
    });
    return res.json();
  },

  async updateNote(id: string, content: string): Promise<Note> {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content }),
    });
    return res.json();
  },

  async deleteNote(id: string) {
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    return res.json();
  },

  // Groups
  async getGroups(): Promise<StudyGroup[]> {
    const res = await fetch('/api/groups', { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async getGroup(id: string): Promise<StudyGroup> {
    const res = await fetch(`/api/groups/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Group not found');
    return res.json();
  },

  async createGroup(data: {
    name: string;
    description?: string;
    studyPlanTitle?: string;
    dailyTargetMinutes?: number;
    requiredParticipationPercent?: number;
    playlistUrl?: string;
  }): Promise<StudyGroup> {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create group');
    }
    return res.json();
  },

  async joinGroup(inviteCode: string): Promise<StudyGroup> {
    const res = await fetch('/api/groups/join', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ inviteCode }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to join group');
    }
    return res.json();
  },

  async updateGroupSettings(
    groupId: string,
    data: {
      name?: string;
      description?: string;
      dailyTargetMinutes?: number;
      requiredParticipationPercent?: number;
      status?: 'active' | 'paused' | 'archived';
    }
  ): Promise<StudyGroup> {
    const res = await fetch(`/api/groups/${groupId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update group settings');
    }
    return res.json();
  },

  async setGroupStudyPlan(
    groupId: string,
    playlistUrl: string,
    dailyTargetMinutes?: number
  ): Promise<StudyGroup> {
    const res = await fetch(`/api/groups/${groupId}/plan`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ playlistUrl, dailyTargetMinutes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to set group study plan');
    }
    return res.json();
  },

  async leaveGroup(groupId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/groups/${groupId}/leave`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to leave group');
    }
    return res.json();
  },

  async deleteGroup(groupId: string, archive = false): Promise<{ success: boolean }> {
    const url = archive ? `/api/groups/${groupId}?archive=true` : `/api/groups/${groupId}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete/archive group');
    }
    return res.json();
  },

  async updateLiveStatus(groupId: string, status: LiveStudyStatus) {
    const res = await fetch(`/api/groups/${groupId}/live-status`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  // Group Chat
  async getGroupMessages(groupId: string, channelId?: string): Promise<ChatMessage[]> {
    const url = channelId ? `/api/groups/${groupId}/messages?channelId=${channelId}` : `/api/groups/${groupId}/messages`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async sendGroupMessage(groupId: string, message: string, channelId = 'general', replyToId?: string): Promise<ChatMessage> {
    const res = await fetch(`/api/groups/${groupId}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message, channelId, replyToId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send message');
    }
    return res.json();
  },

  async editGroupMessage(groupId: string, msgId: string, message: string): Promise<{ id: string; message: string; updatedAt: string }> {
    const res = await fetch(`/api/groups/${groupId}/messages/${msgId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to edit message');
    }
    return res.json();
  },

  async deleteGroupMessage(groupId: string, msgId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/groups/${groupId}/messages/${msgId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete message');
    }
    return res.json();
  },

  async reactToMessage(groupId: string, msgId: string, emoji: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/groups/${groupId}/messages/${msgId}/react`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ emoji }),
    });
    return res.json();
  },

  async markChatRead(groupId: string, lastReadMessageId?: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/groups/${groupId}/chat/read`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ lastReadMessageId }),
    });
    return res.json();
  },

  async searchGroupMessages(groupId: string, query: string): Promise<ChatMessage[]> {
    const res = await fetch(`/api/groups/${groupId}/chat/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  // Notifications
  async getNotifications(): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
    const res = await fetch('/api/notifications', { headers: getAuthHeaders() });
    if (!res.ok) return { notifications: [], unreadCount: 0 };
    return res.json();
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    const res = await fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Study Reminders
  async getReminderSettings(): Promise<StudyReminderSetting> {
    const res = await fetch('/api/reminders', { headers: getAuthHeaders() });
    if (!res.ok) return { enabled: false, reminderTime: '20:00' };
    return res.json();
  },

  async updateReminderSettings(enabled: boolean, reminderTime: string): Promise<StudyReminderSetting> {
    const res = await fetch('/api/reminders', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ enabled, reminderTime }),
    });
    return res.json();
  },

  // Group Daily Discussion
  async postDailyDiscussion(groupId: string, data: { dayNumber: number; learnedToday: string; difficulty: 'easy' | 'medium' | 'hard'; doubtQuestion?: string }): Promise<DailyDiscussion> {
    const res = await fetch(`/api/groups/${groupId}/discussion`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Friends
  async getFriends(): Promise<Friend[]> {
    const res = await fetch('/api/friends', { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async sendFriendRequest(name: string, email: string): Promise<Friend> {
    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, email }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send request');
    }
    return res.json();
  },

  async acceptFriendRequest(friendId: string) {
    const res = await fetch('/api/friends/accept', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ friendId }),
    });
    return res.json();
  },

  // Bookmarks
  async getBookmarks(): Promise<Bookmark[]> {
    const res = await fetch('/api/bookmarks', { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async addBookmark(title: string, type: 'video' | 'note' | 'question' | 'resource', url?: string): Promise<Bookmark> {
    const res = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, type, url }),
    });
    return res.json();
  },

  async deleteBookmark(id: string) {
    const res = await fetch(`/api/bookmarks/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    return res.json();
  },

  // Achievements
  async getAchievements(): Promise<Achievement[]> {
    const res = await fetch('/api/achievements', { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  // Practice Questions
  async getPracticeQuestions(): Promise<PracticeQuestion[]> {
    const res = await fetch('/api/practice-questions', { headers: getAuthHeaders() });
    return res.json();
  },

  // AI Assistant
  async askAIDoubt(question: string, contextTitle?: string) {
    const res = await fetch('/api/ai/doubt-assistant', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ question, contextTitle }),
    });
    return res.json();
  },

  async getAISummary(videoTitles: string[], dayNumber: number) {
    const res = await fetch('/api/ai/summary', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ videoTitles, dayNumber }),
    });
    return res.json();
  },

  // Stats
  async getStats(): Promise<UserStats> {
    const res = await fetch('/api/stats', { headers: getAuthHeaders() });
    return res.json();
  },

  // Step 6: Personal & Course Analytics
  async getAnalytics(timeRange = 'week', startDate?: string, endDate?: string) {
    let url = `/api/analytics?timeRange=${timeRange}`;
    if (startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  async getCourseDetailAnalytics(courseId: string) {
    const res = await fetch(`/api/analytics/courses/${courseId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch course detail analytics');
    return res.json();
  },

  // Study Calendar & Day Details
  async getCalendar(year?: number, month?: number) {
    let url = '/api/calendar';
    if (year && month) {
      url += `?year=${year}&month=${month}`;
    }
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch study calendar');
    return res.json();
  },

  async getDayDetails(dateStr: string) {
    const res = await fetch(`/api/calendar/day/${dateStr}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch day details');
    return res.json();
  },

  // History
  async getStudyHistory() {
    const res = await fetch('/api/history', { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  // Gamification & Level
  async getGamificationData() {
    const res = await fetch('/api/gamification', { headers: getAuthHeaders() });
    if (!res.ok) return null;
    return res.json();
  },

  // Personal Learning Goals
  async getGoals() {
    const res = await fetch('/api/goals', { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async createGoal(data: { title: string; type: string; target: number; startDate: string; endDate: string }) {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create goal');
    }
    return res.json();
  },

  async deleteGoal(goalId: string) {
    const res = await fetch(`/api/goals/${goalId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Group Analytics & Leaderboard
  async getGroupAnalytics(groupId: string) {
    const res = await fetch(`/api/groups/${groupId}/analytics`, { headers: getAuthHeaders() });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch group analytics');
    }
    return res.json();
  },

  async getGroupLeaderboard(groupId: string, timeframe = 'all') {
    const res = await fetch(`/api/groups/${groupId}/leaderboard?timeframe=${timeframe}`, { headers: getAuthHeaders() });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch group leaderboard');
    }
    return res.json();
  },

  // Account Data Export & Deletion
  async exportUserData() {
    const res = await fetch('/api/user/export', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to export account data');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studynest-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async deleteAccount() {
    const res = await fetch('/api/user/delete', {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete account');
    }
    localStorage.removeItem('studynest_auth_token');
    return res.json();
  },
};

