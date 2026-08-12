export type VideoStatus = 'not_started' | 'watching' | 'completed';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string;
  bio?: string;
  privacyShowProfile?: boolean;
  privacyShowStats?: boolean;
}

export interface Video {
  id: string;
  studyPlanId: string;
  youtubeVideoId: string;
  title: string;
  url: string;
  durationSeconds: number;
  durationFormatted: string;
  thumbnailUrl: string;
  position: number;
  status?: VideoStatus;
  completed?: boolean;
  completedAt?: string;
  startedAt?: string;
}

export interface DayVideo {
  id: string;
  studyDayId: string;
  videoId: string;
  video: Video;
  status?: VideoStatus;
  completed: boolean;
  completedAt?: string;
  startedAt?: string;
}

export interface StudyDay {
  id: string;
  studyPlanId: string;
  dayNumber: number;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'missed';
  completedAt?: string;
  videos: DayVideo[];
  isLongSession?: boolean;
  notes?: string;
}

export interface StudyPlan {
  id: string;
  userId: string;
  title: string;
  description?: string;
  playlistUrl: string;
  playlistId: string;
  channelTitle?: string;
  thumbnailUrl?: string;
  dailyTargetMinutes: number;
  flexibility: 'strict' | 'flexible';
  allowVideoSplitting: boolean;
  createdAt: string;
  totalVideos: number;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  estimatedDays: number;
  completedVideosCount: number;
  completedDaysCount: number;
  days: StudyDay[];
}

export interface Note {
  id: string;
  userId: string;
  studyPlanId?: string;
  videoId?: string;
  videoTitle?: string;
  dayNumber?: number;
  content: string;
  updatedAt: string;
}

export type LiveStudyStatus = 'studying' | 'taking_a_break' | 'completed' | 'not_started';

export interface GroupMemberProgress {
  userId: string;
  userName: string;
  userEmail: string;
  avatarUrl?: string;
  completedToday: boolean;
  todayProgressMinutes?: number;
  todayTargetMinutes?: number;
  todayProgressPercent: number;
  streak: number;
  totalStudySeconds?: number;
  completedDaysCount?: number;
  courseProgressPercent?: number;
  liveStatus?: LiveStudyStatus;
  lastActive?: string;
}

export interface ChatReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface ChatMessage {
  id: string;
  groupId: string;
  channelId?: 'general' | 'doubts' | 'resources' | 'announcements';
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  message: string;
  timestamp: string;
  deletedAt?: string | null;
  updatedAt?: string | null;
  replyToId?: string | null;
  replyToMessage?: {
    id: string;
    senderName: string;
    message: string;
  } | null;
  reactions?: ChatReaction[];
  failed?: boolean;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'mention' | 'invitation' | 'group_join' | 'group_streak' | 'achievement' | 'goal_completed' | 'reminder';
  title: string;
  message: string;
  relatedGroupId?: string;
  relatedMessageId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface StudyReminderSetting {
  enabled: boolean;
  reminderTime: string;
}

export interface DailyDiscussion {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  dayNumber: number;
  learnedToday: string;
  difficulty: 'easy' | 'medium' | 'hard';
  doubtQuestion?: string;
  createdAt: string;
}

export interface GroupActivity {
  id: string;
  groupId: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  activityType: string;
  description: string;
  createdAt: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  inviteCode: string;
  studyPlanId?: string;
  studyPlanTitle: string;
  dailyTargetMinutes: number;
  requiredParticipationPercent: number; // e.g. 60 for 60%
  status: 'active' | 'paused' | 'archived';
  createdAt: string;
  groupStreak: number;
  longestGroupStreak: number;
  todayParticipationPercent: number;
  completedMembersTodayCount: number;
  totalMembersCount: number;
  totalGroupStudyMinutes: number;
  averageMemberProgressPercent: number;
  studyPlan?: StudyPlan;
  members: GroupMemberProgress[];
  activeChannel?: 'general' | 'doubts' | 'resources' | 'announcements';
  discussions?: DailyDiscussion[];
  activities?: GroupActivity[];
  unreadCount?: number;
}

export interface PracticeQuestion {
  id: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  codeSnippet?: string;
  hint?: string;
  solution: string;
  status?: 'solved' | 'saved' | 'unsolved';
}

export interface Friend {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  status: 'accepted' | 'pending_sent' | 'pending_received';
  streak: number;
  currentCourse: string;
  lastActive: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  title: string;
  url?: string;
  type: 'video' | 'note' | 'question' | 'resource';
  itemRefId?: string;
  createdAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  category: 'streak' | 'learning' | 'group' | 'milestone';
}

export interface UserStats {
  totalStudySeconds: number;
  completedVideos: number;
  completedDays: number;
  completedPlans: number;
  currentStreak: number;
  longestStreak: number;
  weeklyActivity: { day: string; minutes: number }[];
  monthlyActivity: { date: string; minutes: number; count: number }[];
}

export interface YouTubePlaylistMeta {
  playlistId: string;
  title: string;
  description: string;
  channelTitle: string;
  thumbnailUrl: string;
  totalVideos: number;
  videos: {
    youtubeVideoId: string;
    title: string;
    url: string;
    durationSeconds: number;
    durationFormatted: string;
    thumbnailUrl: string;
    position: number;
  }[];
}

