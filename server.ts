import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { groupVideosIntoDays, formatDuration } from './src/utils/scheduler';
import { DEMO_PLAYLISTS, PREDEFINED_PRACTICE_QUESTIONS } from './src/data/demoPlaylists';
import {
  dbQuery,
  dbGet,
  dbRun,
} from './server/db';
import {
  authMiddleware,
  optionalAuthMiddleware,
  hashPassword,
  comparePassword,
  generateToken,
  AuthRequest,
} from './server/auth';
import { initWebSocketServer, broadcastToGroup, sendNotificationToUser } from './server/websocket';
import { logStudyActivity, getUserGamificationData, checkAndUnlockAchievements, updateActiveUserGoals } from './server/gamification';
import {
  getPersonalAnalytics,
  getCourseDetailAnalytics,
  getStudyCalendar,
  getDayDetails,
  getStudyHistory,
  getGroupAnalytics,
  getGroupLeaderboard,
} from './server/analytics';

export const app = express();
const PORT = 3000;

app.use(express.json());

// Helper: Parse ISO 8601 YouTube video duration
function parseISO8601Duration(durationStr: string): number {
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 300;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Helper: Extract YouTube Playlist ID
function extractPlaylistId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (trimmed.startsWith('PL') || trimmed.startsWith('UU') || trimmed.startsWith('FL')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    const listParam = parsed.searchParams.get('list');
    if (listParam) return listParam;
  } catch (e) {}
  const match = trimmed.match(/[&?]list=([^&]+)/);
  return match ? match[1] : null;
}

// Lazy Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// --- AUTHENTICATION ROUTES ---

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existingUser = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const userId = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const passHash = await hashPassword(password);
    const createdAt = new Date().toISOString();
    const avatarUrl = `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150&auto=format&fit=crop&q=80`;

    await dbRun(
      `INSERT INTO users (id, name, email, password_hash, avatar_url, created_at, current_streak, longest_streak)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
      [userId, name.trim(), email.toLowerCase().trim(), passHash, avatarUrl, createdAt]
    );

    const userObj = {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      avatarUrl,
      bio: '',
      createdAt,
      currentStreak: 0,
      longestStreak: 0,
      privacyShowProfile: true,
      privacyShowStats: true,
    };

    const token = generateToken({ id: userId, email: userObj.email, name: userObj.name });
    return res.status(201).json({ user: userObj, token });
  } catch (err: any) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: err.message || 'Signup failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const userRow = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!userRow) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const match = await comparePassword(password, userRow.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userObj = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      avatarUrl: userRow.avatar_url,
      bio: userRow.bio || '',
      createdAt: userRow.created_at,
      currentStreak: userRow.current_streak || 0,
      longestStreak: userRow.longest_streak || 0,
      privacyShowProfile: Boolean(userRow.privacy_show_profile),
      privacyShowStats: Boolean(userRow.privacy_show_stats),
    };

    const token = generateToken({ id: userObj.id, email: userObj.email, name: userObj.name });
    return res.json({ user: userObj, token });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userRow = await dbGet('SELECT * FROM users WHERE id = ?', [req.user!.id]);
    if (!userRow) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      avatarUrl: userRow.avatar_url,
      bio: userRow.bio || '',
      createdAt: userRow.created_at,
      currentStreak: userRow.current_streak || 0,
      longestStreak: userRow.longest_streak || 0,
      privacyShowProfile: Boolean(userRow.privacy_show_profile),
      privacyShowStats: Boolean(userRow.privacy_show_stats),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile
app.put('/api/user/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, email, bio } = req.body;
    const userId = req.user!.id;

    await dbRun('UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), bio = COALESCE(?, bio) WHERE id = ?', [
      name ? name.trim() : null,
      email ? email.toLowerCase().trim() : null,
      bio,
      userId,
    ]);

    const updated = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      avatarUrl: updated.avatar_url,
      bio: updated.bio || '',
      createdAt: updated.created_at,
      currentStreak: updated.current_streak || 0,
      longestStreak: updated.longest_streak || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export User Data
app.get('/api/user/export', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const profile = await dbGet('SELECT id, name, email, bio, created_at, current_streak, longest_streak FROM users WHERE id = ?', [userId]);
    const plans = await dbQuery('SELECT * FROM study_plans WHERE user_id = ?', [userId]);
    const notes = await dbQuery('SELECT * FROM notes WHERE user_id = ?', [userId]);
    const activities = await dbQuery('SELECT * FROM study_activity_logs WHERE user_id = ?', [userId]);
    const achievements = await dbQuery('SELECT * FROM user_achievements WHERE user_id = ?', [userId]);
    const goals = await dbQuery('SELECT * FROM user_goals WHERE user_id = ?', [userId]);

    const exportData = {
      app: 'StudyNest',
      exportedAt: new Date().toISOString(),
      profile,
      studyPlans: plans,
      notes,
      activityHistory: activities,
      achievements,
      goals,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="studynest-data-${userId}.json"`);
    res.json(exportData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Account Permanently
app.delete('/api/user/delete', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Delete user-created data
    await dbRun('DELETE FROM study_activity_logs WHERE user_id = ?', [userId]);
    await dbRun('DELETE FROM day_videos WHERE plan_id IN (SELECT id FROM study_plans WHERE user_id = ?)', [userId]);
    await dbRun('DELETE FROM study_days WHERE plan_id IN (SELECT id FROM study_plans WHERE user_id = ?)', [userId]);
    await dbRun('DELETE FROM study_plans WHERE user_id = ?', [userId]);
    await dbRun('DELETE FROM notes WHERE user_id = ?', [userId]);
    await dbRun('DELETE FROM user_achievements WHERE user_id = ?', [userId]);
    await dbRun('DELETE FROM xp_transactions WHERE user_id = ?', [userId]);
    await dbRun('DELETE FROM user_goals WHERE user_id = ?', [userId]);
    await dbRun('DELETE FROM notifications WHERE user_id = ?', [userId]);
    await dbRun('DELETE FROM group_members WHERE user_id = ?', [userId]);
    await dbRun('DELETE FROM group_chat_messages WHERE user_id = ?', [userId]);
    await dbRun('DELETE FROM group_activities WHERE user_id = ?', [userId]);
    await dbRun('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ success: true, message: 'Account and associated data deleted permanently.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- PLAYLIST ANALYSIS ---
app.post('/api/playlists/analyze', async (req, res) => {
  try {
    const { playlistUrl, demoKey } = req.body;

    if (demoKey && DEMO_PLAYLISTS[demoKey]) {
      return res.json(DEMO_PLAYLISTS[demoKey]);
    }

    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId && !playlistUrl) {
      return res.status(400).json({ error: 'Please enter a valid YouTube playlist URL or ID.' });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    if (apiKey && playlistId) {
      try {
        // 1. Fetch playlist snippet & status
        const playlistRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlists?part=snippet,status&id=${playlistId}&key=${apiKey}`
        );
        const playlistData = await playlistRes.json();

        if (playlistRes.status === 400 || playlistRes.status === 403) {
          return res.status(400).json({
            error: playlistData.error?.message || 'YouTube API error: Invalid API key or quota exceeded. Please check your YOUTUBE_API_KEY configuration.'
          });
        }

        if (!playlistData.items || playlistData.items.length === 0) {
          return res.status(404).json({
            error: "We couldn't access this playlist. Please check that the playlist is public and the URL is correct."
          });
        }

        const playlistItem = playlistData.items[0];
        if (playlistItem.status?.privacyStatus === 'private') {
          return res.status(400).json({
            error: 'This playlist is private. Please make sure the playlist privacy is set to Public or Unlisted.'
          });
        }

        const snippet = playlistItem.snippet;
        const title = snippet.title;
        const description = snippet.description || '';
        const channelTitle = snippet.channelTitle || 'YouTube Educator';
        const thumbnailUrl = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '';

        // 2. Fetch all playlist items (supporting pagination up to 500 videos)
        let pageToken = '';
        const rawVideoItems: any[] = [];
        const videoIds: string[] = [];

        do {
          const pageUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
          const itemsRes = await fetch(pageUrl);
          if (!itemsRes.ok) break;

          const itemsData = await itemsRes.json();
          if (itemsData.items) {
            for (const item of itemsData.items) {
              const vId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
              const vTitle = item.snippet?.title || '';
              if (vId && vTitle !== 'Private video' && vTitle !== 'Deleted video' && vTitle !== 'Unavailable video') {
                videoIds.push(vId);
                rawVideoItems.push(item);
              }
            }
          }
          pageToken = itemsData.nextPageToken || '';
        } while (pageToken && rawVideoItems.length < 500);

        if (rawVideoItems.length === 0) {
          return res.status(404).json({
            error: 'No usable public videos were found in this playlist.'
          });
        }

        // 3. Batch fetch video durations in chunks of 50
        const durationMap: Record<string, { durationSecs: number; durationFmt: string }> = {};

        for (let i = 0; i < videoIds.length; i += 50) {
          const chunk = videoIds.slice(i, i + 50);
          const videoDetailsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${chunk.join(',')}&key=${apiKey}`
          );
          if (videoDetailsRes.ok) {
            const videoDetailsData = await videoDetailsRes.json();
            for (const vDetail of videoDetailsData.items || []) {
              const iso = vDetail.contentDetails?.duration || 'PT5M';
              const secs = parseISO8601Duration(iso);
              durationMap[vDetail.id] = { durationSecs: secs, durationFmt: formatDuration(secs) };
            }
          }
        }

        const formattedVideos = rawVideoItems.map((item, idx) => {
          const vId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
          const dur = durationMap[vId] || { durationSecs: 900, durationFmt: '15m' };
          return {
            youtubeVideoId: vId,
            title: item.snippet?.title || `Video ${idx + 1}`,
            url: `https://www.youtube.com/watch?v=${vId}`,
            durationSeconds: dur.durationSecs,
            durationFormatted: dur.durationFmt,
            thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
            position: idx + 1,
          };
        });

        return res.json({
          playlistId,
          title,
          description,
          channelTitle,
          thumbnailUrl,
          totalVideos: formattedVideos.length,
          videos: formattedVideos,
        });
      } catch (err: any) {
        return res.status(400).json({
          error: err.message || "We couldn't access this playlist. Please check that the playlist is public and the URL is correct."
        });
      }
    }

    // Check if playlistId matches demo dataset
    if (playlistId && DEMO_PLAYLISTS[playlistId]) {
      return res.json(DEMO_PLAYLISTS[playlistId]);
    }

    if (!apiKey) {
      return res.status(400).json({
        error: 'YouTube API key (YOUTUBE_API_KEY) is not configured on the server. Please add your YOUTUBE_API_KEY environment variable or select one of the featured preset demo playlists below.'
      });
    }

    return res.status(400).json({
      error: "We couldn't access this playlist. Please check that the playlist is public and the URL is correct."
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to analyze playlist' });
  }
});

// --- STUDY PLANS ROUTES ---

// Create Study Plan
app.post('/api/study-plans', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      title,
      description,
      playlistUrl,
      playlistId,
      channelTitle,
      thumbnailUrl,
      dailyTargetMinutes = 60,
      flexibility = 'flexible',
      allowVideoSplitting = false,
      videos = [],
    } = req.body;

    const planId = `plan_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const grouping = groupVideosIntoDays(videos, planId, {
      targetMinutes: Number(dailyTargetMinutes),
      flexibility,
      allowVideoSplitting,
    });

    const createdAt = new Date().toISOString();

    await dbRun(
      `INSERT INTO study_plans
       (id, user_id, title, description, playlist_url, playlist_id, channel_title, thumbnail_url,
        daily_target_minutes, flexibility, allow_video_splitting, created_at, total_videos,
        total_duration_seconds, total_duration_formatted, estimated_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        planId,
        userId,
        title || 'My Study Plan',
        description || '',
        playlistUrl,
        playlistId,
        channelTitle || 'YouTube Educator',
        thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
        Number(dailyTargetMinutes),
        flexibility,
        allowVideoSplitting ? 1 : 0,
        createdAt,
        videos.length,
        grouping.totalPlaylistDurationSeconds,
        grouping.totalPlaylistDurationFormatted,
        grouping.totalPlannedDays,
      ]
    );

    // Insert Study Days and Day Videos
    for (const day of grouping.days) {
      await dbRun(
        `INSERT INTO study_days
         (id, plan_id, day_number, title, target_minutes, actual_duration_seconds, actual_duration_formatted, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'not_started')`,
        [
          day.id,
          planId,
          day.dayNumber,
          `Day ${day.dayNumber} Session`,
          Number(dailyTargetMinutes),
          day.totalDurationSeconds,
          day.totalDurationFormatted,
        ]
      );

      for (const dv of day.videos) {
        await dbRun(
          `INSERT INTO day_videos
           (id, day_id, plan_id, youtube_video_id, title, url, duration_seconds, duration_formatted, thumbnail_url, position, status, completed)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_started', 0)`,
          [
            dv.id,
            day.id,
            planId,
            dv.video.youtubeVideoId,
            dv.video.title,
            dv.video.url,
            dv.video.durationSeconds,
            dv.video.durationFormatted,
            dv.video.thumbnailUrl,
            dv.video.position,
          ]
        );
      }
    }

    // Fetch newly created plan
    const fullPlan = await getFullPlan(planId, userId);
    return res.status(201).json(fullPlan);
  } catch (err: any) {
    console.error('Create plan error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create study plan' });
  }
});

// Helper: load full plan object from DB
async function getFullPlan(planId: string, userId: string) {
  const planRow = await dbGet('SELECT * FROM study_plans WHERE id = ? AND user_id = ?', [planId, userId]);
  if (!planRow) return null;

  const dayRows = await dbQuery('SELECT * FROM study_days WHERE plan_id = ? ORDER BY day_number ASC', [planId]);
  const videoRows = await dbQuery('SELECT * FROM day_videos WHERE plan_id = ? ORDER BY position ASC', [planId]);

  const daysFormatted = dayRows.map((day) => {
    const dayVids = videoRows
      .filter((v) => v.day_id === day.id)
      .map((v) => ({
        id: v.id,
        videoId: v.id,
        dayId: day.id,
        completed: Boolean(v.completed),
        status: v.status,
        completedAt: v.completed_at,
        startedAt: v.started_at,
        video: {
          id: v.id,
          youtubeVideoId: v.youtube_video_id,
          title: v.title,
          url: v.url,
          durationSeconds: v.duration_seconds,
          durationFormatted: v.duration_formatted,
          thumbnailUrl: v.thumbnail_url,
          position: v.position,
          completed: Boolean(v.completed),
          status: v.status,
        },
      }));

    return {
      id: day.id,
      dayNumber: day.day_number,
      title: day.title,
      targetMinutes: day.target_minutes,
      actualDurationSeconds: day.actual_duration_seconds,
      actualDurationFormatted: day.actual_duration_formatted,
      status: day.status,
      completedAt: day.completed_at,
      videos: dayVids,
    };
  });

  const totalCompletedVideos = videoRows.filter((v) => v.completed).length;
  const totalCompletedDays = dayRows.filter((d) => d.status === 'completed').length;

  return {
    id: planRow.id,
    userId: planRow.user_id,
    title: planRow.title,
    description: planRow.description,
    playlistUrl: planRow.playlist_url,
    playlistId: planRow.playlist_id,
    channelTitle: planRow.channel_title,
    thumbnailUrl: planRow.thumbnail_url,
    dailyTargetMinutes: planRow.daily_target_minutes,
    flexibility: planRow.flexibility,
    allowVideoSplitting: Boolean(planRow.allow_video_splitting),
    createdAt: planRow.created_at,
    totalVideos: planRow.total_videos,
    totalDurationSeconds: planRow.total_duration_seconds,
    totalDurationFormatted: planRow.total_duration_formatted,
    estimatedDays: planRow.estimated_days,
    completedVideosCount: totalCompletedVideos,
    completedDaysCount: totalCompletedDays,
    days: daysFormatted,
  };
}

// Helper: Update user streak based on consecutive dates
async function updateUserStreakOnCompletion(userId: string): Promise<number> {
  const userRow = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
  if (!userRow) return 0;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let currentStreak = userRow.current_streak || 0;
  const lastDate = userRow.last_completed_date;

  if (lastDate === todayStr) {
    return currentStreak > 0 ? currentStreak : 1;
  }

  if (lastDate === yesterdayStr) {
    currentStreak += 1;
  } else {
    currentStreak = 1;
  }

  const longest = Math.max(currentStreak, userRow.longest_streak || 0);
  await dbRun(
    'UPDATE users SET current_streak = ?, longest_streak = ?, last_completed_date = ? WHERE id = ?',
    [currentStreak, longest, todayStr, userId]
  );

  return currentStreak;
}

// Get User's Study Plans
app.get('/api/study-plans', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const planRows = await dbQuery('SELECT id FROM study_plans WHERE user_id = ? ORDER BY created_at DESC', [userId]);

    const plans = [];
    for (const row of planRows) {
      const p = await getFullPlan(row.id, userId);
      if (p) plans.push(p);
    }

    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Study Plan
app.get('/api/study-plans/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const plan = await getFullPlan(req.params.id, userId);
    if (!plan) return res.status(404).json({ error: 'Study plan not found' });
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Study Plan (title, daily target, status)
app.put('/api/study-plans/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const planId = req.params.id;
    const { title, dailyTargetMinutes, status } = req.body;

    const existing = await dbGet('SELECT * FROM study_plans WHERE id = ? AND user_id = ?', [planId, userId]);
    if (!existing) return res.status(404).json({ error: 'Study plan not found' });

    await dbRun(
      `UPDATE study_plans
       SET title = COALESCE(?, title),
           daily_target_minutes = COALESCE(?, daily_target_minutes),
           status = COALESCE(?, status)
       WHERE id = ? AND user_id = ?`,
      [
        title ? title.trim() : null,
        dailyTargetMinutes ? Number(dailyTargetMinutes) : null,
        status ? status.trim() : null,
        planId,
        userId,
      ]
    );

    const updated = await getFullPlan(planId, userId);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Study Plan
app.delete('/api/study-plans/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    await dbRun('DELETE FROM study_plans WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start Watching Video (Sets status = 'watching')
app.post('/api/videos/:videoId/start-watch', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user!.id;

    const vid = await dbGet('SELECT * FROM day_videos WHERE id = ?', [videoId]);
    if (vid) {
      const now = new Date().toISOString();
      await dbRun("UPDATE day_videos SET status = 'watching', started_at = ? WHERE id = ? AND status != 'completed'", [
        now,
        videoId,
      ]);
      await dbRun("UPDATE study_days SET status = 'in_progress' WHERE id = ? AND status = 'not_started'", [vid.day_id]);
    }

    const plan = vid ? await getFullPlan(vid.plan_id, userId) : null;
    res.json({ success: true, plan });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark Video Complete
app.post('/api/videos/:videoId/complete', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { videoId } = req.params;
    const { completed = true } = req.body;
    const userId = req.user!.id;

    const vid = await dbGet('SELECT * FROM day_videos WHERE id = ?', [videoId]);
    if (!vid) return res.status(404).json({ error: 'Video not found' });

    const now = new Date().toISOString();

    if (completed) {
      await dbRun("UPDATE day_videos SET status = 'completed', completed = 1, completed_at = ? WHERE id = ?", [now, videoId]);
    } else {
      await dbRun("UPDATE day_videos SET status = 'not_started', completed = 0, completed_at = NULL WHERE id = ?", [videoId]);
    }

    // Check if day is fully completed
    const dayVids = await dbQuery('SELECT * FROM day_videos WHERE day_id = ?', [vid.day_id]);
    const allDone = dayVids.every((v) => Boolean(v.completed));
    const anyDoneOrWatching = dayVids.some((v) => Boolean(v.completed) || v.status === 'watching');

    if (allDone) {
      await dbRun("UPDATE study_days SET status = 'completed', completed_at = ? WHERE id = ?", [now, vid.day_id]);
    } else if (anyDoneOrWatching) {
      await dbRun("UPDATE study_days SET status = 'in_progress', completed_at = NULL WHERE id = ?", [vid.day_id]);
    } else {
      await dbRun("UPDATE study_days SET status = 'not_started', completed_at = NULL WHERE id = ?", [vid.day_id]);
    }

    // Log activity and update gamification if completed
    let newAchievements: any[] = [];
    if (completed) {
      const logRes = await logStudyActivity(
        userId,
        vid.plan_id,
        videoId,
        vid.day_id,
        vid.duration_seconds || 300,
        vid.title || 'Study Video'
      );
      newAchievements = logRes.newAchievements || [];
    } else {
      await dbRun('DELETE FROM study_activity_logs WHERE user_id = ? AND video_id = ?', [userId, videoId]);
    }

    const plan = await getFullPlan(vid.plan_id, userId);
    const gamification = await getUserGamificationData(userId);
    res.json({ success: true, plan, currentStreak: gamification ? gamification.level : 1, gamification, newAchievements });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark Day Complete
app.post('/api/days/:dayId/complete', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { dayId } = req.params;
    const { completed = true } = req.body;
    const userId = req.user!.id;

    const day = await dbGet('SELECT * FROM study_days WHERE id = ?', [dayId]);
    if (!day) return res.status(404).json({ error: 'Day not found' });

    const now = new Date().toISOString();

    if (completed) {
      await dbRun("UPDATE study_days SET status = 'completed', completed_at = ? WHERE id = ?", [now, dayId]);
      await dbRun("UPDATE day_videos SET status = 'completed', completed = 1, completed_at = ? WHERE day_id = ?", [
        now,
        dayId,
      ]);
    } else {
      await dbRun("UPDATE study_days SET status = 'not_started', completed_at = NULL WHERE id = ?", [dayId]);
      await dbRun("UPDATE day_videos SET status = 'not_started', completed = 0, completed_at = NULL WHERE day_id = ?", [dayId]);
    }

    let newAchievements: any[] = [];
    if (completed) {
      const vids = await dbQuery('SELECT * FROM day_videos WHERE day_id = ?', [dayId]);
      for (const v of vids) {
        const logRes = await logStudyActivity(
          userId,
          v.plan_id,
          v.id,
          dayId,
          v.duration_seconds || 300,
          v.title || 'Study Video'
        );
        if (logRes.newAchievements && logRes.newAchievements.length > 0) {
          newAchievements.push(...logRes.newAchievements);
        }
      }
    } else {
      await dbRun('DELETE FROM study_activity_logs WHERE user_id = ? AND day_id = ?', [userId, dayId]);
    }

    const plan = await getFullPlan(day.plan_id, userId);
    const gamification = await getUserGamificationData(userId);
    res.json({ success: true, plan, gamification, newAchievements });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- DASHBOARD API ---
app.get('/api/dashboard', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRow = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);

    const planRows = await dbQuery('SELECT id FROM study_plans WHERE user_id = ? ORDER BY created_at DESC', [userId]);

    let activePlan = null;
    let todaySession = null;

    if (planRows.length > 0) {
      activePlan = await getFullPlan(planRows[0].id, userId);
      if (activePlan) {
        todaySession = activePlan.days.find((d: any) => d.status !== 'completed') || activePlan.days[activePlan.days.length - 1];
      }
    }

    // Calculate real stats from database
    const completedVidRows = await dbQuery(
      `SELECT dv.duration_seconds FROM day_videos dv
       JOIN study_plans sp ON dv.plan_id = sp.id
       WHERE sp.user_id = ? AND dv.completed = 1`,
      [userId]
    );

    const totalWatchTimeSeconds = completedVidRows.reduce((sum, v) => sum + (v.duration_seconds || 0), 0);
    const totalVideosCompleted = completedVidRows.length;

    const completedDayRows = await dbQuery(
      `SELECT sd.id FROM study_days sd
       JOIN study_plans sp ON sd.plan_id = sp.id
       WHERE sp.user_id = ? AND sd.status = 'completed'`,
      [userId]
    );

    res.json({
      user: {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        avatarUrl: userRow.avatar_url,
        bio: userRow.bio || '',
        createdAt: userRow.created_at,
        currentStreak: userRow.current_streak || 0,
        longestStreak: userRow.longest_streak || 0,
      },
      activePlan,
      todaySession,
      stats: {
        totalWatchTimeFormatted: formatDuration(totalWatchTimeSeconds),
        totalWatchTimeSeconds,
        totalVideosCompleted,
        totalDaysCompleted: completedDayRows.length,
        totalPlansCount: planRows.length,
        currentStreak: userRow.current_streak || 0,
        longestStreak: userRow.longest_streak || 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- STEP 6: ANALYTICS, CALENDAR, GAMIFICATION & GOALS APIS ---

// Personal Analytics Dashboard API
app.get('/api/analytics', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { timeRange = 'week', startDate, endDate } = req.query;
    const analytics = await getPersonalAnalytics(
      userId,
      String(timeRange),
      startDate ? String(startDate) : undefined,
      endDate ? String(endDate) : undefined
    );
    res.json(analytics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Course Detail Analytics
app.get('/api/analytics/courses/:courseId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const courseAnalytics = await getCourseDetailAnalytics(userId, req.params.courseId);
    if (!courseAnalytics) return res.status(404).json({ error: 'Course not found' });
    res.json(courseAnalytics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Monthly Study Calendar
app.get('/api/calendar', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;

    const calendarData = await getStudyCalendar(userId, year, month);
    res.json(calendarData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Calendar Day Details
app.get('/api/calendar/day/:dateStr', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const dayDetails = await getDayDetails(userId, req.params.dateStr);
    res.json(dayDetails);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Chronological Study History
app.get('/api/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const history = await getStudyHistory(userId);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Achievements List
app.get('/api/achievements', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    await checkAndUnlockAchievements(userId);

    const allAch = await dbQuery('SELECT * FROM achievements ORDER BY requirement_value ASC');
    const unlockedRows = await dbQuery('SELECT * FROM user_achievements WHERE user_id = ?', [userId]);
    const unlockedMap = new Map(unlockedRows.map((u) => [u.achievement_id, u.unlocked_at]));

    // Compute metrics for locked achievement progress
    const vidsRow = await dbGet('SELECT COUNT(*) as count FROM day_videos v JOIN study_plans p ON v.plan_id = p.id WHERE p.user_id = ? AND v.completed = 1', [userId]);
    const completedVids = vidsRow ? vidsRow.count : 0;

    const daysRow = await dbGet("SELECT COUNT(*) as count FROM study_days d JOIN study_plans p ON d.plan_id = p.id WHERE p.user_id = ? AND d.status = 'completed'", [userId]);
    const completedDays = daysRow ? daysRow.count : 0;

    const secsRow = await dbGet('SELECT COALESCE(SUM(duration_seconds), 0) as total FROM day_videos v JOIN study_plans p ON v.plan_id = p.id WHERE p.user_id = ? AND v.completed = 1', [userId]);
    const totalSecs = secsRow ? Number(secsRow.total) : 0;

    const userRow = await dbGet('SELECT current_streak, longest_streak FROM users WHERE id = ?', [userId]);
    const streak = Math.max(userRow?.current_streak || 0, userRow?.longest_streak || 0);

    const list = allAch.map((ach) => {
      const isUnlocked = unlockedMap.has(ach.id);
      let currentValue = 0;

      switch (ach.requirement_type) {
        case 'completed_videos': currentValue = completedVids; break;
        case 'completed_days': currentValue = completedDays; break;
        case 'streak_days': currentValue = streak; break;
        case 'total_study_seconds': currentValue = totalSecs; break;
        default: currentValue = 0; break;
      }

      return {
        id: ach.id,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        category: ach.category,
        requirementType: ach.requirement_type,
        requirementValue: ach.requirement_value,
        currentValue,
        isUnlocked,
        unlockedAt: unlockedMap.get(ach.id) || null,
      };
    });

    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Gamification (XP, Level)
app.get('/api/gamification', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const gamification = await getUserGamificationData(userId);
    res.json(gamification);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Personal Learning Goals List
app.get('/api/goals', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    await updateActiveUserGoals(userId);

    const goals = await dbQuery('SELECT * FROM user_goals WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(
      goals.map((g) => ({
        id: g.id,
        userId: g.user_id,
        title: g.title,
        type: g.type,
        target: g.target,
        currentValue: g.current_value,
        startDate: g.start_date,
        endDate: g.end_date,
        status: g.status,
        createdAt: g.created_at,
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create Personal Learning Goal
app.post('/api/goals', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { title, type, target, startDate, endDate } = req.body;

    if (!title || !type || !target || !startDate || !endDate) {
      return res.status(400).json({ error: 'Title, type, target, startDate, and endDate are required.' });
    }

    const goalId = `goal_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    await dbRun(
      `INSERT INTO user_goals (id, user_id, title, type, target, current_value, start_date, end_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'active', ?)`,
      [goalId, userId, title.trim(), type, Number(target), startDate, endDate, now]
    );

    await updateActiveUserGoals(userId);

    const newGoal = await dbGet('SELECT * FROM user_goals WHERE id = ?', [goalId]);
    res.status(201).json({
      id: newGoal.id,
      userId: newGoal.user_id,
      title: newGoal.title,
      type: newGoal.type,
      target: newGoal.target,
      currentValue: newGoal.current_value,
      startDate: newGoal.start_date,
      endDate: newGoal.end_date,
      status: newGoal.status,
      createdAt: newGoal.created_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Learning Goal
app.delete('/api/goals/:goalId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    await dbRun('DELETE FROM user_goals WHERE id = ? AND user_id = ?', [req.params.goalId, userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Group Analytics API
app.get('/api/groups/:groupId/analytics', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const analytics = await getGroupAnalytics(req.params.groupId, userId);
    res.json(analytics);
  } catch (err: any) {
    res.status(err.message?.includes('Unauthorized') ? 403 : 500).json({ error: err.message });
  }
});

// Group Leaderboard API
app.get('/api/groups/:groupId/leaderboard', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const timeframe = req.query.timeframe ? String(req.query.timeframe) : 'all';
    const leaderboard = await getGroupLeaderboard(req.params.groupId, userId, timeframe);
    res.json(leaderboard);
  } catch (err: any) {
    res.status(err.message?.includes('Unauthorized') ? 403 : 500).json({ error: err.message });
  }
});

// --- NOTES APIS ---
app.get('/api/notes', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const rows = await dbQuery('SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC', [userId]);

    const notes = rows.map((n) => ({
      id: n.id,
      userId: n.user_id,
      studyPlanId: n.study_plan_id,
      videoId: n.video_id,
      videoTitle: n.video_title,
      dayNumber: n.day_number,
      content: n.content,
      updatedAt: n.updated_at,
    }));

    res.json(notes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { videoTitle, dayNumber, content, studyPlanId, videoId } = req.body;

    const noteId = `note_${Date.now()}`;
    const updatedAt = new Date().toISOString();

    await dbRun(
      `INSERT INTO notes (id, user_id, study_plan_id, video_id, video_title, day_number, content, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [noteId, userId, studyPlanId || null, videoId || null, videoTitle || 'Study Note', dayNumber || 1, content || '', updatedAt]
    );

    const newNote = {
      id: noteId,
      userId,
      studyPlanId,
      videoId,
      videoTitle,
      dayNumber,
      content,
      updatedAt,
    };

    res.status(201).json(newNote);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notes/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { content } = req.body;
    const updatedAt = new Date().toISOString();

    await dbRun('UPDATE notes SET content = ?, updated_at = ? WHERE id = ? AND user_id = ?', [
      content,
      updatedAt,
      req.params.id,
      userId,
    ]);

    const updated = await dbGet('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    res.json({
      id: updated.id,
      userId: updated.user_id,
      content: updated.content,
      updatedAt: updated.updated_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    await dbRun('DELETE FROM notes WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- STUDY GROUPS APIS ---
async function logGroupActivity(groupId: string, userId: string | null, activityType: string, description: string) {
  try {
    const actId = `act_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const createdAt = new Date().toISOString();
    await dbRun(
      `INSERT INTO group_activities (id, group_id, user_id, activity_type, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [actId, groupId, userId || null, activityType, description, createdAt]
    );
  } catch (err) {
    console.error('Error logging group activity:', err);
  }
}

async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const member = await dbGet('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
  return !!member;
}

async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  relatedGroupId?: string,
  relatedMessageId?: string
) {
  const notifId = `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const createdAt = new Date().toISOString();

  await dbRun(
    `INSERT INTO notifications (id, user_id, type, title, message, related_group_id, related_message_id, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [notifId, userId, type, title, message, relatedGroupId || null, relatedMessageId || null, createdAt]
  );

  const notificationObj = {
    id: notifId,
    userId,
    type,
    title,
    message,
    relatedGroupId,
    relatedMessageId,
    isRead: false,
    createdAt,
  };

  sendNotificationToUser(userId, notificationObj);
  return notificationObj;
}

async function getFullGroup(groupId: string, currentUserId?: string) {
  const group = await dbGet('SELECT * FROM groups WHERE id = ?', [groupId]);
  if (!group) return null;

  const owner = await dbGet('SELECT name FROM users WHERE id = ?', [group.owner_id]);

  const memberRows = await dbQuery(
    `SELECT gm.*, u.name as user_name, u.email as user_email, u.avatar_url, u.current_streak
     FROM group_members gm
     JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = ?`,
    [groupId]
  );

  const todayStr = new Date().toISOString().split('T')[0];

  // Fetch shared study plan if assigned
  let studyPlan = null;
  let groupTotalVideos = 0;

  if (group.study_plan_id) {
    studyPlan = await getFullPlan(group.study_plan_id, currentUserId || group.owner_id);
    if (studyPlan) {
      groupTotalVideos = studyPlan.totalVideos || 0;
    }
  }

  const members = await Promise.all(
    memberRows.map(async (m) => {
      let completedVidsCount = 0;
      let totalCompletedSecs = 0;
      let completedTodaySecs = 0;
      let completedToday = false;

      if (studyPlan) {
        const userGroupProgress = await dbQuery(
          `SELECT vp.video_id, vp.completed_at, dv.duration_seconds
           FROM video_progress vp
           JOIN day_videos dv ON (vp.video_id = dv.id OR vp.video_id = dv.youtube_video_id)
           WHERE vp.user_id = ? AND dv.plan_id = ? AND vp.completed = 1`,
          [m.user_id, studyPlan.id]
        );

        completedVidsCount = userGroupProgress.length;
        totalCompletedSecs = userGroupProgress.reduce((sum, v) => sum + (v.duration_seconds || 0), 0);

        const todayVids = userGroupProgress.filter((v) => v.completed_at && v.completed_at.startsWith(todayStr));
        completedTodaySecs = todayVids.reduce((sum, v) => sum + (v.duration_seconds || 0), 0);
        completedToday = completedTodaySecs >= (group.daily_target_minutes || 60) * 60 || todayVids.length > 0;
      } else {
        const completedVids = await dbQuery(
          `SELECT dv.duration_seconds FROM day_videos dv
           JOIN study_plans sp ON dv.plan_id = sp.id
           WHERE sp.user_id = ? AND dv.completed = 1`,
          [m.user_id]
        );
        completedVidsCount = completedVids.length;
        totalCompletedSecs = completedVids.reduce((sum, v) => sum + (v.duration_seconds || 0), 0);

        const completedTodayRow = await dbGet(
          `SELECT sd.id FROM study_days sd
           JOIN study_plans sp ON sd.plan_id = sp.id
           WHERE sp.user_id = ? AND sd.status = 'completed' AND DATE(sd.completed_at) = ?`,
          [m.user_id, todayStr]
        );
        completedToday = Boolean(completedTodayRow);
      }

      const todayProgressMinutes = Math.min(
        group.daily_target_minutes || 60,
        Math.round(completedTodaySecs / 60) || (completedToday ? group.daily_target_minutes || 60 : 0)
      );
      const todayProgressPercent = Math.min(100, Math.round((todayProgressMinutes / (group.daily_target_minutes || 60)) * 100));

      const courseProgressPercent = groupTotalVideos > 0
        ? Math.min(100, Math.round((completedVidsCount / groupTotalVideos) * 100))
        : (completedVidsCount > 0 ? Math.min(100, completedVidsCount * 10) : 0);

      return {
        userId: m.user_id,
        userName: m.user_name,
        userEmail: m.user_email,
        avatarUrl: m.avatar_url,
        completedToday,
        todayProgressMinutes,
        todayTargetMinutes: group.daily_target_minutes || 60,
        todayProgressPercent,
        streak: m.current_streak || 0,
        totalStudySeconds: totalCompletedSecs,
        completedDaysCount: Math.floor(completedVidsCount / 3),
        courseProgressPercent,
        liveStatus: m.live_status || 'not_started',
        lastActive: m.last_active || 'Recently',
        role: m.role || (m.user_id === group.owner_id ? 'owner' : 'member'),
      };
    })
  );

  const totalMembersCount = members.length;
  const completedMembersTodayCount = members.filter((m) => m.completedToday).length;
  const todayParticipationPercent = totalMembersCount > 0 ? Math.round((completedMembersTodayCount / totalMembersCount) * 100) : 0;

  // Calculate Date-Based Group Streak
  let groupStreak = 0;
  let checkDate = new Date();
  const reqPercent = group.required_participation_percent || 60;

  if (todayParticipationPercent >= reqPercent) {
    groupStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < 30; i++) {
    const dStr = checkDate.toISOString().split('T')[0];
    let countOnDate = 0;
    for (const m of memberRows) {
      const vids = await dbQuery(
        `SELECT dv.duration_seconds FROM video_progress vp
         JOIN day_videos dv ON (vp.video_id = dv.id OR vp.video_id = dv.youtube_video_id)
         WHERE vp.user_id = ? AND vp.completed = 1 AND DATE(vp.completed_at) = ?`,
        [m.user_id, dStr]
      );
      const secsOnDate = vids.reduce((sum, v) => sum + (v.duration_seconds || 0), 0);
      if (secsOnDate >= (group.daily_target_minutes || 60) * 60 || vids.length > 0) {
        countOnDate++;
      }
    }
    const partOnDate = totalMembersCount > 0 ? Math.round((countOnDate / totalMembersCount) * 100) : 0;
    if (partOnDate >= reqPercent) {
      groupStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const discussions = await dbQuery(
    `SELECT d.*, u.name as user_name, u.avatar_url
     FROM daily_discussions d
     JOIN users u ON d.user_id = u.id
     WHERE d.group_id = ?
     ORDER BY d.created_at DESC`,
    [groupId]
  );

  const activities = await dbQuery(
    `SELECT ga.*, u.name as user_name, u.avatar_url as user_avatar
     FROM group_activities ga
     LEFT JOIN users u ON ga.user_id = u.id
     WHERE ga.group_id = ?
     ORDER BY ga.created_at DESC LIMIT 20`,
    [groupId]
  );

  const totalGroupStudyMinutes = Math.round(
    members.reduce((sum, m) => sum + (m.totalStudySeconds || 0), 0) / 60
  );

  const averageMemberProgressPercent = totalMembersCount > 0
    ? Math.round(members.reduce((sum, m) => sum + m.courseProgressPercent, 0) / totalMembersCount)
    : 0;

  let unreadCount = 0;
  if (currentUserId) {
    const readState = await dbGet('SELECT * FROM chat_read_states WHERE group_id = ? AND user_id = ?', [groupId, currentUserId]);
    if (readState && readState.last_read_message_id) {
      const lastMsg = await dbGet('SELECT created_at FROM group_chat_messages WHERE id = ?', [readState.last_read_message_id]);
      const minTime = lastMsg ? lastMsg.created_at : readState.updated_at;
      const unreadRow = await dbGet(
        `SELECT COUNT(*) as cnt FROM group_chat_messages WHERE group_id = ? AND sender_id != ? AND created_at > ? AND deleted_at IS NULL`,
        [groupId, currentUserId, minTime]
      );
      unreadCount = unreadRow?.cnt || 0;
    } else {
      const memberRow = await dbGet('SELECT joined_at FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, currentUserId]);
      const minTime = memberRow?.joined_at || '1970-01-01';
      const unreadRow = await dbGet(
        `SELECT COUNT(*) as cnt FROM group_chat_messages WHERE group_id = ? AND sender_id != ? AND created_at >= ? AND deleted_at IS NULL`,
        [groupId, currentUserId, minTime]
      );
      unreadCount = unreadRow?.cnt || 0;
    }
  }

  return {
    id: group.id,
    name: group.name,
    description: group.description || '',
    ownerId: group.owner_id,
    ownerName: owner?.name || 'Group Admin',
    inviteCode: group.invite_code,
    studyPlanId: group.study_plan_id,
    studyPlanTitle: group.study_plan_title,
    dailyTargetMinutes: group.daily_target_minutes || 60,
    requiredParticipationPercent: group.required_participation_percent || 60,
    status: group.status || 'active',
    createdAt: group.created_at,
    groupStreak,
    longestGroupStreak: Math.max(groupStreak, 1),
    todayParticipationPercent,
    completedMembersTodayCount,
    totalMembersCount,
    totalGroupStudyMinutes,
    averageMemberProgressPercent,
    studyPlan,
    activeChannel: 'general',
    unreadCount,
    members,
    discussions: discussions.map((d) => ({
      id: d.id,
      groupId: d.group_id,
      userId: d.user_id,
      userName: d.user_name,
      userAvatar: d.avatar_url,
      dayNumber: d.day_number,
      learnedToday: d.learned_today,
      difficulty: d.difficulty,
      doubtQuestion: d.doubt_question,
      createdAt: d.created_at,
    })),
    activities: activities.map((a) => ({
      id: a.id,
      groupId: a.group_id,
      userId: a.user_id,
      userName: a.user_name,
      userAvatar: a.user_avatar,
      activityType: a.activity_type,
      description: a.description,
      createdAt: a.created_at,
    })),
  };
}

app.get('/api/groups', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const groupRows = await dbQuery(
      `SELECT g.* FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ? AND g.status != 'archived'
       ORDER BY g.created_at DESC`,
      [userId]
    );

    const groups = [];
    for (const g of groupRows) {
      const fullGroup = await getFullGroup(g.id, userId);
      if (fullGroup) groups.push(fullGroup);
    }

    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/groups/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const groupId = req.params.id;

    // Check membership
    const isMember = await dbGet('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this study group.' });
    }

    const fullGroup = await getFullGroup(groupId, userId);
    if (!fullGroup) return res.status(404).json({ error: 'Group not found' });
    res.json(fullGroup);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create Group
app.post('/api/groups', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      name,
      description,
      dailyTargetMinutes = 60,
      requiredParticipationPercent = 60,
      playlistUrl,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required.' });
    }

    const userRow = await dbGet('SELECT name FROM users WHERE id = ?', [userId]);
    const userName = userRow?.name || 'User';

    const groupId = `group_${Date.now()}`;
    const cleanPrefix = name.trim().replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'GRP';
    const inviteCode = `${cleanPrefix}${Math.floor(1000 + Math.random() * 9000)}`;
    const createdAt = new Date().toISOString();

    let studyPlanId = null;
    let studyPlanTitle = 'YouTube Study Curriculum';

    // Process YouTube playlist if provided
    if (playlistUrl && playlistUrl.trim()) {
      try {
        const playlistId = extractPlaylistId(playlistUrl);
        if (playlistId && process.env.YOUTUBE_API_KEY) {
          const apiKey = process.env.YOUTUBE_API_KEY;
          const plRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
          );
          const plData = await plRes.json();
          const plSnippet = plData.items?.[0]?.snippet;

          const itemsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}`
          );
          const itemsData = await itemsRes.json();

          if (itemsData.items && itemsData.items.length > 0) {
            const videoIds = itemsData.items.map((i: any) => i.contentDetails?.videoId).filter(Boolean).join(',');
            const vidsRes = await fetch(
              `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${apiKey}`
            );
            const vidsData = await vidsRes.json();
            const videoDetailsMap: Record<string, any> = {};
            (vidsData.items || []).forEach((v: any) => {
              videoDetailsMap[v.id] = v;
            });

            const parsedVideos = itemsData.items.map((item: any, idx: number) => {
              const vId = item.contentDetails?.videoId;
              const details = videoDetailsMap[vId];
              const durationIso = details?.contentDetails?.duration || 'PT5M';
              const durationSec = parseISO8601Duration(durationIso);
              return {
                youtubeVideoId: vId,
                title: item.snippet?.title || `Video ${idx + 1}`,
                url: `https://www.youtube.com/watch?v=${vId}`,
                durationSeconds: durationSec,
                durationFormatted: formatDuration(durationSec),
                thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
                position: idx + 1,
              };
            });

            studyPlanTitle = plSnippet?.title || `${name.trim()} Curriculum`;
            studyPlanId = `plan_grp_${Date.now()}`;

            const totalSecs = parsedVideos.reduce((sum: number, v: any) => sum + v.durationSeconds, 0);
            const groupingResult = groupVideosIntoDays(parsedVideos, studyPlanId, {
              targetMinutes: Number(dailyTargetMinutes),
              flexibility: 'flexible',
              allowVideoSplitting: false,
            });
            const daysGrouped = groupingResult.days;

            await dbRun(
              `INSERT INTO study_plans (id, user_id, title, description, playlist_url, playlist_id, channel_title, thumbnail_url, daily_target_minutes, created_at, total_videos, total_duration_seconds, total_duration_formatted, estimated_days)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                studyPlanId,
                userId,
                studyPlanTitle,
                `Group study plan for ${name}`,
                playlistUrl.trim(),
                playlistId,
                plSnippet?.channelTitle || '',
                plSnippet?.thumbnails?.medium?.url || '',
                Number(dailyTargetMinutes),
                createdAt,
                parsedVideos.length,
                totalSecs,
                formatDuration(totalSecs),
                daysGrouped.length,
              ]
            );

            for (const day of daysGrouped) {
              const dayId = `day_${studyPlanId}_${day.dayNumber}`;
              await dbRun(
                `INSERT INTO study_days (id, plan_id, day_number, title, target_minutes, actual_duration_seconds, actual_duration_formatted, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'not_started')`,
                [
                  dayId,
                  studyPlanId,
                  day.dayNumber,
                  `Day ${day.dayNumber}: ${day.videos[0]?.video?.title || 'Study Session'}`,
                  Number(dailyTargetMinutes),
                  day.totalDurationSeconds,
                  day.totalDurationFormatted,
                ]
              );

              for (const v of day.videos) {
                const vid = v.video;
                if (!vid) continue;
                const vidId = `vid_${studyPlanId}_${vid.position || 1}`;
                await dbRun(
                  `INSERT INTO day_videos (id, day_id, plan_id, youtube_video_id, title, url, duration_seconds, duration_formatted, thumbnail_url, position, status, completed)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_started', 0)`,
                  [
                    vidId,
                    dayId,
                    studyPlanId,
                    vid.youtubeVideoId,
                    vid.title,
                    vid.url,
                    vid.durationSeconds,
                    vid.durationFormatted,
                    vid.thumbnailUrl,
                    vid.position || 1,
                  ]
                );
              }
            }
          }
        }
      } catch (err) {
        console.error('Error attaching playlist to group:', err);
      }
    }

    await dbRun(
      `INSERT INTO groups (id, name, description, owner_id, invite_code, study_plan_id, study_plan_title, daily_target_minutes, required_participation_percent, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        groupId,
        name.trim(),
        description ? description.trim() : '',
        userId,
        inviteCode,
        studyPlanId,
        studyPlanTitle,
        Number(dailyTargetMinutes),
        Number(requiredParticipationPercent),
        createdAt,
      ]
    );

    // Add owner as owner member
    await dbRun(
      `INSERT INTO group_members (id, group_id, user_id, role, joined_at, live_status, last_active)
       VALUES (?, ?, ?, 'owner', ?, 'not_started', 'Just now')`,
      [`gm_${Date.now()}`, groupId, userId, createdAt]
    );

    await logGroupActivity(groupId, userId, 'create_group', `${userName} created the group`);

    const fullGroup = await getFullGroup(groupId, userId);
    return res.status(201).json(fullGroup);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Join Group
app.post('/api/groups/join', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { inviteCode } = req.body;

    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({ error: 'Invite code is required.' });
    }

    const group = await dbGet('SELECT * FROM groups WHERE UPPER(invite_code) = ?', [inviteCode.trim().toUpperCase()]);
    if (!group) return res.status(404).json({ error: 'Invalid invite code. Group not found.' });

    if (group.status === 'archived') {
      return res.status(400).json({ error: 'This group is archived and is no longer accepting new members.' });
    }

    const existing = await dbGet('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [group.id, userId]);
    if (existing) {
      return res.status(400).json({ error: 'You are already a member of this study group.' });
    }

    const userRow = await dbGet('SELECT name FROM users WHERE id = ?', [userId]);
    const userName = userRow?.name || 'User';

    await dbRun(
      `INSERT INTO group_members (id, group_id, user_id, role, joined_at, live_status, last_active)
       VALUES (?, ?, ?, 'member', ?, 'not_started', 'Just now')`,
      [`gm_${Date.now()}`, group.id, userId, new Date().toISOString()]
    );

    await logGroupActivity(group.id, userId, 'join_group', `${userName} joined the group via invite code`);

    await createNotification(userId, 'group_join', `Joined ${group.name}`, `You joined "${group.name}". Welcome to the team!`, group.id);
    if (group.owner_id !== userId) {
      await createNotification(group.owner_id, 'group_join', `New Member in ${group.name}`, `${userName} joined your group "${group.name}".`, group.id);
    }

    const fullGroup = await getFullGroup(group.id, userId);
    return res.json(fullGroup);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update Group Settings (Admin Only)
app.put('/api/groups/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const groupId = req.params.id;
    const { name, description, dailyTargetMinutes, requiredParticipationPercent, status } = req.body;

    const group = await dbGet('SELECT * FROM groups WHERE id = ?', [groupId]);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the group admin can update group settings.' });
    }

    await dbRun(
      `UPDATE groups
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           daily_target_minutes = COALESCE(?, daily_target_minutes),
           required_participation_percent = COALESCE(?, required_participation_percent),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        description !== undefined ? description.trim() : null,
        dailyTargetMinutes ? Number(dailyTargetMinutes) : null,
        requiredParticipationPercent ? Number(requiredParticipationPercent) : null,
        status ? status.trim() : null,
        groupId,
      ]
    );

    await logGroupActivity(groupId, userId, 'update_settings', `Group settings were updated by admin`);

    const updated = await getFullGroup(groupId, userId);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Set / Update Group Study Plan (Admin Only)
app.post('/api/groups/:id/plan', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const groupId = req.params.id;
    const { playlistUrl, dailyTargetMinutes } = req.body;

    const group = await dbGet('SELECT * FROM groups WHERE id = ?', [groupId]);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the group admin can set the study plan.' });
    }

    if (!playlistUrl || !playlistUrl.trim()) {
      return res.status(400).json({ error: 'Playlist URL is required.' });
    }

    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId || !process.env.YOUTUBE_API_KEY) {
      return res.status(400).json({ error: 'Invalid YouTube playlist URL or API key missing.' });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    const plRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
    );
    const plData = await plRes.json();
    const plSnippet = plData.items?.[0]?.snippet;

    const itemsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}`
    );
    const itemsData = await itemsRes.json();

    if (!itemsData.items || itemsData.items.length === 0) {
      return res.status(400).json({ error: 'No videos found in this playlist.' });
    }

    const videoIds = itemsData.items.map((i: any) => i.contentDetails?.videoId).filter(Boolean).join(',');
    const vidsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${apiKey}`
    );
    const vidsData = await vidsRes.json();
    const videoDetailsMap: Record<string, any> = {};
    (vidsData.items || []).forEach((v: any) => {
      videoDetailsMap[v.id] = v;
    });

    const parsedVideos = itemsData.items.map((item: any, idx: number) => {
      const vId = item.contentDetails?.videoId;
      const details = videoDetailsMap[vId];
      const durationIso = details?.contentDetails?.duration || 'PT5M';
      const durationSec = parseISO8601Duration(durationIso);
      return {
        youtubeVideoId: vId,
        title: item.snippet?.title || `Video ${idx + 1}`,
        url: `https://www.youtube.com/watch?v=${vId}`,
        durationSeconds: durationSec,
        durationFormatted: formatDuration(durationSec),
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
        position: idx + 1,
      };
    });

    const studyPlanTitle = plSnippet?.title || `${group.name} Curriculum`;
    const studyPlanId = `plan_grp_${Date.now()}`;
    const targetMins = dailyTargetMinutes ? Number(dailyTargetMinutes) : (group.daily_target_minutes || 60);
    const createdAt = new Date().toISOString();
    const totalSecs = parsedVideos.reduce((sum: number, v: any) => sum + v.durationSeconds, 0);
    const groupingResult = groupVideosIntoDays(parsedVideos, studyPlanId, {
      targetMinutes: targetMins,
      flexibility: 'flexible',
      allowVideoSplitting: false,
    });
    const daysGrouped = groupingResult.days;

    await dbRun(
      `INSERT INTO study_plans (id, user_id, title, description, playlist_url, playlist_id, channel_title, thumbnail_url, daily_target_minutes, created_at, total_videos, total_duration_seconds, total_duration_formatted, estimated_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studyPlanId,
        userId,
        studyPlanTitle,
        `Shared curriculum for group ${group.name}`,
        playlistUrl.trim(),
        playlistId,
        plSnippet?.channelTitle || '',
        plSnippet?.thumbnails?.medium?.url || '',
        targetMins,
        createdAt,
        parsedVideos.length,
        totalSecs,
        formatDuration(totalSecs),
        daysGrouped.length,
      ]
    );

    for (const day of daysGrouped) {
      const dayId = `day_${studyPlanId}_${day.dayNumber}`;
      await dbRun(
        `INSERT INTO study_days (id, plan_id, day_number, title, target_minutes, actual_duration_seconds, actual_duration_formatted, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'not_started')`,
        [
          dayId,
          studyPlanId,
          day.dayNumber,
          `Day ${day.dayNumber}: ${day.videos[0]?.video?.title || 'Study Session'}`,
          targetMins,
          day.totalDurationSeconds,
          day.totalDurationFormatted,
        ]
      );

      for (const v of day.videos) {
        const vid = v.video;
        if (!vid) continue;
        const vidId = `vid_${studyPlanId}_${vid.position || 1}`;
        await dbRun(
          `INSERT INTO day_videos (id, day_id, plan_id, youtube_video_id, title, url, duration_seconds, duration_formatted, thumbnail_url, position, status, completed)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_started', 0)`,
          [
            vidId,
            dayId,
            studyPlanId,
            vid.youtubeVideoId,
            vid.title,
            vid.url,
            vid.durationSeconds,
            vid.durationFormatted,
            vid.thumbnailUrl,
            vid.position || 1,
          ]
        );
      }
    }

    await dbRun('UPDATE groups SET study_plan_id = ?, study_plan_title = ? WHERE id = ?', [studyPlanId, studyPlanTitle, groupId]);

    await logGroupActivity(groupId, userId, 'set_plan', `Group study plan updated to "${studyPlanTitle}"`);

    const updated = await getFullGroup(groupId, userId);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Leave Group
app.post('/api/groups/:id/leave', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const groupId = req.params.id;

    const group = await dbGet('SELECT * FROM groups WHERE id = ?', [groupId]);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.owner_id === userId) {
      return res.status(400).json({ error: 'Group owners cannot leave their group. You can archive or delete the group instead.' });
    }

    const userRow = await dbGet('SELECT name FROM users WHERE id = ?', [userId]);
    const userName = userRow?.name || 'User';

    await dbRun('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
    await logGroupActivity(groupId, userId, 'leave_group', `${userName} left the group`);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete / Archive Group (Admin Only)
app.delete('/api/groups/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const groupId = req.params.id;
    const archiveOnly = req.query.archive === 'true';

    const group = await dbGet('SELECT * FROM groups WHERE id = ?', [groupId]);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the group admin can delete or archive the group.' });
    }

    if (archiveOnly) {
      await dbRun("UPDATE groups SET status = 'archived' WHERE id = ?", [groupId]);
      await logGroupActivity(groupId, userId, 'archive_group', `Group was archived by admin`);
    } else {
      await dbRun('DELETE FROM group_members WHERE group_id = ?', [groupId]);
      await dbRun('DELETE FROM group_activities WHERE group_id = ?', [groupId]);
      await dbRun('DELETE FROM daily_discussions WHERE group_id = ?', [groupId]);
      await dbRun('DELETE FROM group_chat_messages WHERE group_id = ?', [groupId]);
      await dbRun('DELETE FROM groups WHERE id = ?', [groupId]);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Group Live Status
app.post('/api/groups/:groupId/live-status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { groupId } = req.params;
    const { status } = req.body;

    await dbRun("UPDATE group_members SET live_status = ?, last_active = 'Just now' WHERE group_id = ? AND user_id = ?", [
      status,
      groupId,
      userId,
    ]);

    const fullGroup = await getFullGroup(groupId, userId);
    return res.json({ success: true, group: fullGroup });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// --- GROUP CHAT MESSAGES APIS ---
app.get('/api/groups/:groupId/messages', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { groupId } = req.params;
    const { channelId = 'general' } = req.query;

    if (!(await isGroupMember(groupId, userId))) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this study group.' });
    }

    const msgRows = await dbQuery(
      `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
       FROM group_chat_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.group_id = ? AND m.channel_id = ?
       ORDER BY m.created_at ASC`,
      [groupId, String(channelId)]
    );

    const msgs = await Promise.all(
      msgRows.map(async (m) => {
        const reactions = await dbQuery('SELECT emoji, user_id FROM message_reactions WHERE message_id = ?', [m.id]);
        const reactionGroup: Record<string, string[]> = {};
        for (const r of reactions) {
          if (!reactionGroup[r.emoji]) reactionGroup[r.emoji] = [];
          reactionGroup[r.emoji].push(r.user_id);
        }

        const formattedReactions = Object.keys(reactionGroup).map((e) => ({
          emoji: e,
          count: reactionGroup[e].length,
          userIds: reactionGroup[e],
        }));

        let replyToMessage = null;
        if (m.reply_to_id) {
          const parentMsg = await dbGet(
            `SELECT m2.id, m2.message, u2.name as sender_name
             FROM group_chat_messages m2
             JOIN users u2 ON m2.sender_id = u2.id
             WHERE m2.id = ?`,
            [m.reply_to_id]
          );
          if (parentMsg) {
            replyToMessage = {
              id: parentMsg.id,
              senderName: parentMsg.sender_name,
              message: parentMsg.message,
            };
          }
        }

        const isDeleted = !!m.deleted_at;

        return {
          id: m.id,
          groupId: m.group_id,
          channelId: m.channel_id,
          senderId: m.sender_id,
          senderName: m.sender_name,
          senderAvatar: m.sender_avatar,
          message: isDeleted ? 'Message deleted' : m.message,
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          deletedAt: m.deleted_at || null,
          updatedAt: m.updated_at || null,
          reactions: formattedReactions,
          replyToId: m.reply_to_id,
          replyToMessage,
        };
      })
    );

    res.json(msgs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups/:groupId/messages', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { groupId } = req.params;
    const { message, channelId = 'general', replyToId } = req.body;

    if (!(await isGroupMember(groupId, userId))) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this study group.' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    const group = await dbGet('SELECT name FROM groups WHERE id = ?', [groupId]);
    const msgId = `msg_${Date.now()}`;
    const createdAt = new Date().toISOString();

    await dbRun(
      `INSERT INTO group_chat_messages (id, group_id, channel_id, sender_id, message, reply_to_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [msgId, groupId, channelId, userId, message.trim(), replyToId || null, createdAt]
    );

    let replyToMessage = null;
    if (replyToId) {
      const parentMsg = await dbGet(
        `SELECT m2.id, m2.message, u2.name as sender_name
         FROM group_chat_messages m2
         JOIN users u2 ON m2.sender_id = u2.id
         WHERE m2.id = ?`,
        [replyToId]
      );
      if (parentMsg) {
        replyToMessage = {
          id: parentMsg.id,
          senderName: parentMsg.sender_name,
          message: parentMsg.message,
        };
      }
    }

    const newMsg = {
      id: msgId,
      groupId,
      channelId,
      senderId: userId,
      senderName: user.name,
      senderAvatar: user.avatar_url,
      message: message.trim(),
      timestamp: new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reactions: [],
      replyToId: replyToId || null,
      replyToMessage,
      deletedAt: null,
      updatedAt: null,
    };

    // Parse @mentions
    const groupMembers = await dbQuery(
      `SELECT gm.user_id, u.name FROM group_members gm JOIN users u ON gm.user_id = u.id WHERE gm.group_id = ?`,
      [groupId]
    );

    const messageText = message.trim();
    for (const member of groupMembers) {
      if (member.user_id === userId) continue;
      const cleanName = member.name.replace(/\s+/g, '');
      const pattern = new RegExp(`@${member.name}|@${cleanName}`, 'i');
      if (pattern.test(messageText)) {
        await createNotification(
          member.user_id,
          'mention',
          `Mentioned in ${group?.name || 'Group'}`,
          `${user.name} mentioned you: "${messageText.substring(0, 80)}${messageText.length > 80 ? '...' : ''}"`,
          groupId,
          msgId
        );
      }
    }

    broadcastToGroup(groupId, 'new_message', { message: newMsg });

    return res.status(201).json(newMsg);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/groups/:groupId/messages/:msgId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { groupId, msgId } = req.params;
    const { message } = req.body;

    if (!(await isGroupMember(groupId, userId))) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this study group.' });
    }

    const msg = await dbGet('SELECT * FROM group_chat_messages WHERE id = ? AND group_id = ?', [msgId, groupId]);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    if (msg.sender_id !== userId) {
      return res.status(403).json({ error: 'You can only edit your own messages.' });
    }

    if (msg.deleted_at) {
      return res.status(400).json({ error: 'Cannot edit a deleted message.' });
    }

    const updatedAt = new Date().toISOString();
    await dbRun('UPDATE group_chat_messages SET message = ?, updated_at = ? WHERE id = ?', [message.trim(), updatedAt, msgId]);

    broadcastToGroup(groupId, 'message_updated', { msgId, message: message.trim(), updatedAt });

    res.json({ id: msgId, message: message.trim(), updatedAt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/groups/:groupId/messages/:msgId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { groupId, msgId } = req.params;

    if (!(await isGroupMember(groupId, userId))) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this study group.' });
    }

    const msg = await dbGet('SELECT * FROM group_chat_messages WHERE id = ? AND group_id = ?', [msgId, groupId]);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const group = await dbGet('SELECT owner_id FROM groups WHERE id = ?', [groupId]);
    const isOwner = group?.owner_id === userId;

    if (msg.sender_id !== userId && !isOwner) {
      return res.status(403).json({ error: 'Only the sender or group admin can delete this message.' });
    }

    const deletedAt = new Date().toISOString();
    await dbRun('UPDATE group_chat_messages SET deleted_at = ? WHERE id = ?', [deletedAt, msgId]);

    broadcastToGroup(groupId, 'message_deleted', { msgId, deletedAt });

    res.json({ success: true, msgId, deletedAt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups/:groupId/messages/:msgId/react', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { msgId, groupId } = req.params;
    const { emoji } = req.body;

    if (!(await isGroupMember(groupId, userId))) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this study group.' });
    }

    const existing = await dbGet('SELECT * FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?', [
      msgId,
      userId,
      emoji,
    ]);

    if (existing) {
      await dbRun('DELETE FROM message_reactions WHERE id = ?', [existing.id]);
    } else {
      await dbRun('INSERT INTO message_reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)', [
        `react_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        msgId,
        userId,
        emoji,
      ]);
    }

    broadcastToGroup(groupId, 'message_reaction_updated', { msgId, emoji, userId });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark chat as read
app.post('/api/groups/:groupId/chat/read', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { groupId } = req.params;
    const { lastReadMessageId } = req.body;

    if (!(await isGroupMember(groupId, userId))) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const now = new Date().toISOString();
    const id = `read_${userId}_${groupId}`;
    await dbRun(
      `INSERT INTO chat_read_states (id, user_id, group_id, last_read_message_id, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, group_id) DO UPDATE SET last_read_message_id = excluded.last_read_message_id, updated_at = excluded.updated_at`,
      [id, userId, groupId, lastReadMessageId || null, now]
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search chat
app.get('/api/groups/:groupId/chat/search', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { groupId } = req.params;
    const q = String(req.query.q || '').trim();

    if (!(await isGroupMember(groupId, userId))) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (!q) return res.json([]);

    const msgRows = await dbQuery(
      `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
       FROM group_chat_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.group_id = ? AND m.message LIKE ? AND m.deleted_at IS NULL
       ORDER BY m.created_at DESC LIMIT 30`,
      [groupId, `%${q}%`]
    );

    const msgs = msgRows.map((m) => ({
      id: m.id,
      groupId: m.group_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      senderAvatar: m.sender_avatar,
      message: m.message,
      timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    res.json(msgs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Notifications APIs
app.get('/api/notifications', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const notifs = await dbQuery('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [userId]);
    const unreadRow = await dbGet('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);

    const formatted = notifs.map((n) => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      message: n.message,
      relatedGroupId: n.related_group_id,
      relatedMessageId: n.related_message_id,
      isRead: !!n.is_read,
      createdAt: n.created_at,
    }));

    res.json({ notifications: formatted, unreadCount: unreadRow?.cnt || 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/:id/read', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const notifId = req.params.id;
    await dbRun('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notifId, userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/read-all', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    await dbRun('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reminder Settings APIs
app.get('/api/reminders', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const row = await dbGet('SELECT * FROM study_reminders WHERE user_id = ?', [userId]);
    res.json({ enabled: !!(row?.enabled), reminderTime: row?.reminder_time || '20:00' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/reminders', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { enabled, reminderTime = '20:00' } = req.body;
    const now = new Date().toISOString();

    await dbRun(
      `INSERT INTO study_reminders (user_id, enabled, reminder_time, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET enabled = excluded.enabled, reminder_time = excluded.reminder_time, updated_at = excluded.updated_at`,
      [userId, enabled ? 1 : 0, reminderTime, now]
    );

    res.json({ enabled: !!enabled, reminderTime });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Group Discussion
app.post('/api/groups/:groupId/discussion', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { groupId } = req.params;
    const { dayNumber, learnedToday, difficulty, doubtQuestion } = req.body;

    const discId = `disc_${Date.now()}`;
    const createdAt = new Date().toISOString();

    await dbRun(
      `INSERT INTO daily_discussions (id, group_id, user_id, day_number, learned_today, difficulty, doubt_question, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [discId, groupId, userId, Number(dayNumber) || 1, learnedToday, difficulty || 'medium', doubtQuestion || null, createdAt]
    );

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);

    const newDisc = {
      id: discId,
      groupId,
      userId,
      userName: user.name,
      userAvatar: user.avatar_url,
      dayNumber: Number(dayNumber) || 1,
      learnedToday,
      difficulty: difficulty || 'medium',
      doubtQuestion,
      createdAt,
    };

    res.status(201).json(newDisc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- FRIENDS APIS ---
app.get('/api/friends', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const friendRows = await dbQuery(
      `SELECT f.*,
              u1.name as u1_name, u1.email as u1_email, u1.avatar_url as u1_avatar, u1.current_streak as u1_streak,
              u2.name as u2_name, u2.email as u2_email, u2.avatar_url as u2_avatar, u2.current_streak as u2_streak
       FROM friendships f
       JOIN users u1 ON f.user_id_1 = u1.id
       JOIN users u2 ON f.user_id_2 = u2.id
       WHERE f.user_id_1 = ? OR f.user_id_2 = ?`,
      [userId, userId]
    );

    const friends = friendRows.map((f) => {
      const isUser1 = f.user_id_1 === userId;
      const otherId = isUser1 ? f.user_id_2 : f.user_id_1;
      const otherName = isUser1 ? f.u2_name : f.u1_name;
      const otherEmail = isUser1 ? f.u2_email : f.u1_email;
      const otherAvatar = isUser1 ? f.u2_avatar : f.u1_avatar;
      const otherStreak = isUser1 ? f.u2_streak : f.u1_streak;

      return {
        id: f.id,
        friendUserId: otherId,
        name: otherName,
        email: otherEmail,
        avatarUrl: otherAvatar,
        status: f.status,
        streak: otherStreak || 0,
        currentCourse: 'YouTube Playlist',
        lastActive: 'Active recently',
      };
    });

    res.json(friends);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/friends/request', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: 'Email is required' });

    const targetUser = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!targetUser) return res.status(404).json({ error: 'User not found with this email.' });
    if (targetUser.id === userId) return res.status(400).json({ error: 'You cannot add yourself as a friend.' });

    const existing = await dbGet(
      'SELECT * FROM friendships WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)',
      [userId, targetUser.id, targetUser.id, userId]
    );

    if (existing) return res.status(400).json({ error: 'Friend request already exists.' });

    const fId = `friend_${Date.now()}`;
    await dbRun('INSERT INTO friendships (id, user_id_1, user_id_2, status, created_at) VALUES (?, ?, ?, ?, ?)', [
      fId,
      userId,
      targetUser.id,
      'pending_sent',
      new Date().toISOString(),
    ]);

    res.status(201).json({
      id: fId,
      friendUserId: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      avatarUrl: targetUser.avatar_url,
      status: 'pending_sent',
      streak: targetUser.current_streak || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/friends/accept', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { friendId } = req.body;
    await dbRun("UPDATE friendships SET status = 'accepted' WHERE id = ?", [friendId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- BOOKMARKS APIS ---
app.get('/api/bookmarks', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const rows = await dbQuery('SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC', [userId]);

    const bookmarks = rows.map((b) => ({
      id: b.id,
      userId: b.user_id,
      title: b.title,
      type: b.type,
      url: b.url,
      itemRefId: b.item_ref_id,
      createdAt: b.created_at,
    }));

    res.json(bookmarks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookmarks', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { title, type, url, itemRefId } = req.body;

    const bmId = `bm_${Date.now()}`;
    const createdAt = new Date().toISOString();

    await dbRun('INSERT INTO bookmarks (id, user_id, title, type, url, item_ref_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      bmId,
      userId,
      title,
      type,
      url || null,
      itemRefId || null,
      createdAt,
    ]);

    res.status(201).json({ id: bmId, userId, title, type, url, itemRefId, createdAt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bookmarks/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    await dbRun('DELETE FROM bookmarks WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- ACHIEVEMENTS & PRACTICE QUESTIONS ---
app.get('/api/achievements', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRow = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);

    const completedDayRows = await dbQuery(
      `SELECT sd.id FROM study_days sd
       JOIN study_plans sp ON sd.plan_id = sp.id
       WHERE sp.user_id = ? AND sd.status = 'completed'`,
      [userId]
    );

    const achievementsList = [
      {
        id: 'ach_1',
        title: '🌱 First Day',
        description: 'Completed your first daily study session.',
        icon: '🌱',
        category: 'milestone',
        unlockedAt: completedDayRows.length >= 1 ? 'Unlocked' : undefined,
      },
      {
        id: 'ach_2',
        title: '🔥 7 Day Streak',
        description: 'Studied consistently for 7 consecutive days.',
        icon: '🔥',
        category: 'streak',
        unlockedAt: (userRow.current_streak || 0) >= 7 ? 'Unlocked' : undefined,
      },
      {
        id: 'ach_3',
        title: '👥 Study Buddy',
        description: 'Joined and actively studied with a study group.',
        icon: '👥',
        category: 'group',
      },
      {
        id: 'ach_4',
        title: '🏆 Team Player',
        description: 'Contributed to keeping your group streak alive.',
        icon: '🏆',
        category: 'group',
      },
      {
        id: 'ach_5',
        title: '🚀 30 Day Streak',
        description: 'Study for 30 consecutive days.',
        icon: '🚀',
        category: 'streak',
        unlockedAt: (userRow.current_streak || 0) >= 30 ? 'Unlocked' : undefined,
      },
    ];

    res.json(achievementsList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/practice-questions', (_req, res) => {
  res.json(PREDEFINED_PRACTICE_QUESTIONS);
});

// --- STATS API ---
app.get('/api/stats', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRow = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);

    const completedVidRows = await dbQuery(
      `SELECT dv.duration_seconds FROM day_videos dv
       JOIN study_plans sp ON dv.plan_id = sp.id
       WHERE sp.user_id = ? AND dv.completed = 1`,
      [userId]
    );

    const totalWatchTimeSeconds = completedVidRows.reduce((sum, v) => sum + (v.duration_seconds || 0), 0);

    const completedDayRows = await dbQuery(
      `SELECT sd.id FROM study_days sd
       JOIN study_plans sp ON sd.plan_id = sp.id
       WHERE sp.user_id = ? AND sd.status = 'completed'`,
      [userId]
    );

    const planRows = await dbQuery('SELECT * FROM study_plans WHERE user_id = ?', [userId]);

    res.json({
      totalStudySeconds: totalWatchTimeSeconds,
      completedVideos: completedVidRows.length,
      completedDays: completedDayRows.length,
      completedPlans: planRows.filter((p) => p.completed_days_count > 0 && p.completed_days_count === p.estimated_days).length,
      currentStreak: userRow.current_streak || 0,
      longestStreak: userRow.longest_streak || 0,
      weeklyActivity: [
        { day: 'Mon', minutes: 0 },
        { day: 'Tue', minutes: 0 },
        { day: 'Wed', minutes: 0 },
        { day: 'Thu', minutes: 0 },
        { day: 'Fri', minutes: 0 },
        { day: 'Sat', minutes: 0 },
        { day: 'Sun', minutes: 0 },
      ],
      monthlyActivity: [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI FEATURES (Server-Side) ---
app.post('/api/ai/doubt-assistant', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { question, contextTitle } = req.body;
    if (!question) return res.status(400).json({ error: 'Question is required' });

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        answer:
          `Great question about ${contextTitle || 'programming'}!\n\n` +
          `• **Concept**: ${question}\n` +
          `• **Explanation**: Clear logic and structured variable naming help build reliable software.\n` +
          `• **Pro Tip**: Practice running small code snippets to verify behavior hands-on!`,
        source: 'fallback',
      });
    }

    const prompt =
      `You are StudyNest AI Tutor, an encouraging study assistant for a student learning from YouTube programming courses.\n` +
      `Topic Context: ${contextTitle || 'Programming'}\n` +
      `Student Question: "${question}"\n\n` +
      `Provide a clear, beginner-friendly answer with bullet points and short code blocks if appropriate (<250 words).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    res.json({ answer: response.text || 'No answer generated.', source: 'gemini' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/summary', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { videoTitles, dayNumber } = req.body;
    const titlesList = (videoTitles || []).join(', ');

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        summary:
          `### Day ${dayNumber || 1} Revision Summary\n\n` +
          `**Topics Covered**: ${titlesList || 'Core Principles'}\n\n` +
          `1. **Key Takeaway**: Master fundamental syntax and control flow.\n` +
          `2. **Best Practice**: Test logic with small test cases.\n` +
          `3. **Quick Recap**: Practice hands-on code examples before moving to the next day!`,
      });
    }

    const prompt =
      `Write a crisp markdown revision summary for Day ${dayNumber || 1} of a programming study plan.\n` +
      `Videos watched: ${titlesList}\n\n` +
      `Include:\n` +
      `- 3 Key Concepts (bullet points)\n` +
      `- 1 Quick Code Example / Pattern\n` +
      `- 1 Pro Tip for retention`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    res.json({ summary: response.text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- VITE MIDDLEWARE & SERVER INITIALIZATION ---
async function startServer() {
  const server = createServer(app);

  // Initialize WebSockets for real-time group chat
  initWebSocketServer(server);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[StudyNest] Full-Stack Multi-User Server running at http://0.0.0.0:${PORT}`);
  });
}

// API error handling for serverless and Express runtimes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) {
    return;
  }
  res.status(err.status || 500).json({ error: err.message || 'A server error occurred' });
});

export default app;

if (!process.env.VERCEL) {
  startServer();
}
