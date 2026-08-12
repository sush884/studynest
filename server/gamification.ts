import { dbQuery, dbGet, dbRun } from './db';
import { sendNotificationToUser } from './websocket';

// Calculate User Level and XP bounds
export function calculateLevelFromXP(totalXP: number) {
  const levels = [
    { level: 1, min: 0, max: 99 },
    { level: 2, min: 100, max: 249 },
    { level: 3, min: 250, max: 499 },
    { level: 4, min: 500, max: 999 },
    { level: 5, min: 1000, max: 1999 },
  ];

  if (totalXP < 2000) {
    const l = levels.find((lvl) => totalXP >= lvl.min && totalXP <= lvl.max) || levels[0];
    const range = l.max - l.min + 1;
    const progressInLevel = totalXP - l.min;
    const progressPercent = Math.min(100, Math.floor((progressInLevel / range) * 100));
    return {
      level: l.level,
      totalXP,
      currentLevelMinXP: l.min,
      nextLevelMinXP: l.max + 1,
      xpToNextLevel: l.max + 1 - totalXP,
      levelProgressPercent: progressPercent,
    };
  }

  // Level 6+
  const extraXP = totalXP - 2000;
  const levelOffset = Math.floor(extraXP / 1000);
  const currentLevel = 6 + levelOffset;
  const currentLevelMinXP = 2000 + levelOffset * 1000;
  const nextLevelMinXP = currentLevelMinXP + 1000;
  const progressPercent = Math.min(100, Math.floor(((totalXP - currentLevelMinXP) / 1000) * 100));

  return {
    level: currentLevel,
    totalXP,
    currentLevelMinXP,
    nextLevelMinXP,
    xpToNextLevel: nextLevelMinXP - totalXP,
    levelProgressPercent: progressPercent,
  };
}

// Award XP to user safely (idempotent for specific reason + entity)
export async function awardXP(
  userId: string,
  amount: number,
  reason: string,
  relatedEntityId?: string
) {
  if (amount <= 0) return 0;

  if (relatedEntityId) {
    const existing = await dbGet(
      'SELECT id FROM xp_transactions WHERE user_id = ? AND reason = ? AND related_entity_id = ?',
      [userId, reason, relatedEntityId]
    );
    if (existing) {
      // Already awarded
      const sumRow = await dbGet('SELECT COALESCE(SUM(amount), 0) as total FROM xp_transactions WHERE user_id = ?', [userId]);
      return sumRow ? sumRow.total : 0;
    }
  }

  const txId = `xp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  await dbRun(
    `INSERT INTO xp_transactions (id, user_id, amount, reason, related_entity_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [txId, userId, amount, reason, relatedEntityId || null, now]
  );

  const sumRow = await dbGet('SELECT COALESCE(SUM(amount), 0) as total FROM xp_transactions WHERE user_id = ?', [userId]);
  return sumRow ? sumRow.total : 0;
}

// Get user gamification status
export async function getUserGamificationData(userId: string) {
  const sumRow = await dbGet('SELECT COALESCE(SUM(amount), 0) as total FROM xp_transactions WHERE user_id = ?', [userId]);
  const totalXP = sumRow ? Number(sumRow.total) : 0;

  const levelInfo = calculateLevelFromXP(totalXP);

  const recentTx = await dbQuery(
    'SELECT * FROM xp_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
    [userId]
  );

  return {
    ...levelInfo,
    recentTransactions: recentTx.map((t) => ({
      id: t.id,
      amount: t.amount,
      reason: t.reason,
      createdAt: t.created_at,
    })),
  };
}

// Calculate qualifying study streak based on daily target
export async function calculateAndSyncUserStreak(userId: string): Promise<{ currentStreak: number; longestStreak: number }> {
  // Get all study activity grouped by date_str
  const dailyLogs = await dbQuery(
    `SELECT date_str, SUM(duration_seconds) as day_seconds
     FROM study_activity_logs
     WHERE user_id = ?
     GROUP BY date_str
     ORDER BY date_str DESC`,
    [userId]
  );

  const userRow = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
  if (!userRow) return { currentStreak: 0, longestStreak: 0 };

  // Fetch daily target requirement (default 60 min = 3600s, or min 1 second if no target)
  const defaultTargetSecs = 60 * 60; // 60 mins default target

  // Map of dates with qualifying study
  const qualifyingDates = new Set<string>();
  for (const log of dailyLogs) {
    if (log.day_seconds > 0) {
      qualifyingDates.add(log.date_str);
    }
  }

  if (qualifyingDates.size === 0) {
    await dbRun('UPDATE users SET current_streak = 0 WHERE id = ?', [userId]);
    return { currentStreak: 0, longestStreak: userRow.longest_streak || 0 };
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let currentStreak = 0;
  let checkDate = new Date(today);

  // If today has qualifying study, start counting backwards from today
  if (qualifyingDates.has(todayStr)) {
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (qualifyingDates.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  } else if (qualifyingDates.has(yesterdayStr)) {
    // If today hasn't qualified yet but yesterday did, streak is alive from yesterday
    checkDate = new Date(yesterday);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (qualifyingDates.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  } else {
    currentStreak = 0;
  }

  // Calculate longest streak historically
  const sortedDates = Array.from(qualifyingDates).sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dStr of sortedDates) {
    const curDate = new Date(dStr);
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffTime = Math.abs(curDate.getTime() - prevDate.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    prevDate = curDate;
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  longestStreak = Math.max(longestStreak, userRow.longest_streak || 0, currentStreak);

  await dbRun(
    'UPDATE users SET current_streak = ?, longest_streak = ? WHERE id = ?',
    [currentStreak, longestStreak, userId]
  );

  return { currentStreak, longestStreak };
}

// Check and unlock achievements for a user
export async function checkAndUnlockAchievements(userId: string) {
  const achievements = await dbQuery('SELECT * FROM achievements');
  const unlocked = await dbQuery('SELECT achievement_id FROM user_achievements WHERE user_id = ?', [userId]);
  const unlockedSet = new Set(unlocked.map((u) => u.achievement_id));

  // Compute metrics from DB
  const vidsCountRow = await dbGet(
    `SELECT COUNT(*) as count FROM day_videos v
     JOIN study_plans p ON v.plan_id = p.id
     WHERE p.user_id = ? AND v.completed = 1`,
    [userId]
  );
  const completedVideos = vidsCountRow ? vidsCountRow.count : 0;

  const daysCountRow = await dbGet(
    `SELECT COUNT(*) as count FROM study_days d
     JOIN study_plans p ON d.plan_id = p.id
     WHERE p.user_id = ? AND d.status = 'completed'`,
    [userId]
  );
  const completedDays = daysCountRow ? daysCountRow.count : 0;

  const totalTimeRow = await dbGet(
    `SELECT COALESCE(SUM(duration_seconds), 0) as total FROM day_videos v
     JOIN study_plans p ON v.plan_id = p.id
     WHERE p.user_id = ? AND v.completed = 1`,
    [userId]
  );
  const totalStudySeconds = totalTimeRow ? Number(totalTimeRow.total) : 0;

  const streakInfo = await calculateAndSyncUserStreak(userId);

  // Courses completed
  const allPlans = await dbQuery('SELECT id FROM study_plans WHERE user_id = ?', [userId]);
  let coursesCompleted = 0;

  for (const plan of allPlans) {
    const uncompletedVid = await dbGet(
      'SELECT id FROM day_videos WHERE plan_id = ? AND completed = 0',
      [plan.id]
    );
    if (!uncompletedVid) {
      const hasVids = await dbGet('SELECT id FROM day_videos WHERE plan_id = ?', [plan.id]);
      if (hasVids) coursesCompleted++;
    }
  }

  const newUnlocked = [];
  const now = new Date().toISOString();

  for (const ach of achievements) {
    if (unlockedSet.has(ach.id)) continue;

    let targetMet = false;
    const reqVal = ach.requirement_value;

    switch (ach.requirement_type) {
      case 'completed_videos':
        targetMet = completedVideos >= reqVal;
        break;
      case 'completed_days':
        targetMet = completedDays >= reqVal;
        break;
      case 'streak_days':
        targetMet = streakInfo.currentStreak >= reqVal || streakInfo.longestStreak >= reqVal;
        break;
      case 'total_study_seconds':
        targetMet = totalStudySeconds >= reqVal;
        break;
      case 'courses_completed':
        targetMet = coursesCompleted >= reqVal;
        break;
    }

    if (targetMet) {
      const uaId = `ua_${Date.now()}_${ach.id}`;
      try {
        await dbRun(
          'INSERT INTO user_achievements (id, user_id, achievement_id, unlocked_at) VALUES (?, ?, ?, ?)',
          [uaId, userId, ach.id, now]
        );

        // Award bonus XP
        await awardXP(userId, 50, `Unlocked Achievement: ${ach.name}`, ach.id);

        // Persistent notification
        const notifId = `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        await dbRun(
          `INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
           VALUES (?, ?, 'achievement', ?, ?, 0, ?)`,
          [notifId, userId, `🏆 Achievement Unlocked: ${ach.name}`, ach.description, now]
        );

        // WebSocket notification
        sendNotificationToUser(userId, {
          id: notifId,
          type: 'achievement',
          title: `🏆 Achievement Unlocked: ${ach.name}`,
          message: ach.description,
          createdAt: now,
        });

        newUnlocked.push({
          id: ach.id,
          name: ach.name,
          description: ach.description,
          icon: ach.icon,
          unlockedAt: now,
        });
      } catch (e) {
        // Prevent duplicate insertion errors
      }
    }
  }

  return newUnlocked;
}

// Log completed video study activity
export async function logStudyActivity(
  userId: string,
  planId: string,
  videoId: string,
  dayId: string,
  durationSeconds: number,
  videoTitle: string
) {
  const now = new Date().toISOString();
  const dateStr = now.split('T')[0];

  const logId = `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  await dbRun(
    `INSERT INTO study_activity_logs (id, user_id, plan_id, video_id, day_id, duration_seconds, completed_at, date_str)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [logId, userId, planId, videoId, dayId, durationSeconds, now, dateStr]
  );

  // 1. Award +10 XP for video completion
  await awardXP(userId, 10, `Completed video: ${videoTitle}`, videoId);

  // 2. Check if day is completed -> Award +25 XP
  const dayVids = await dbQuery('SELECT * FROM day_videos WHERE day_id = ?', [dayId]);
  const allDayDone = dayVids.length > 0 && dayVids.every((v) => Boolean(v.completed));
  if (allDayDone) {
    await awardXP(userId, 25, 'Completed daily study target', dayId);
  }

  // 3. Check if plan is completed -> Award +100 XP
  const planVids = await dbQuery('SELECT * FROM day_videos WHERE plan_id = ?', [planId]);
  const allPlanDone = planVids.length > 0 && planVids.every((v) => Boolean(v.completed));
  if (allPlanDone) {
    await awardXP(userId, 100, 'Completed study plan', planId);
  }

  // Sync streak & check achievements
  await calculateAndSyncUserStreak(userId);
  const newAchievements = await checkAndUnlockAchievements(userId);

  // Check goals
  await updateActiveUserGoals(userId);

  return { newAchievements };
}

// Update active user goals from real DB data
export async function updateActiveUserGoals(userId: string) {
  const activeGoals = await dbQuery("SELECT * FROM user_goals WHERE user_id = ? AND status = 'active'", [userId]);

  for (const goal of activeGoals) {
    let currVal = 0;

    if (goal.type === 'study_minutes') {
      const sumRow = await dbGet(
        `SELECT COALESCE(SUM(duration_seconds), 0) as total
         FROM study_activity_logs
         WHERE user_id = ? AND completed_at >= ? AND completed_at <= ?`,
        [userId, goal.start_date, goal.end_date]
      );
      currVal = Math.round((sumRow ? Number(sumRow.total) : 0) / 60);
    } else if (goal.type === 'completed_videos') {
      const countRow = await dbGet(
        `SELECT COUNT(*) as count
         FROM study_activity_logs
         WHERE user_id = ? AND completed_at >= ? AND completed_at <= ?`,
        [userId, goal.start_date, goal.end_date]
      );
      currVal = countRow ? countRow.count : 0;
    } else if (goal.type === 'streak_days') {
      const streakInfo = await calculateAndSyncUserStreak(userId);
      currVal = streakInfo.currentStreak;
    }

    let status = 'active';
    if (currVal >= goal.target) {
      status = 'completed';
      // Award goal bonus XP (+50 XP)
      await awardXP(userId, 50, `Completed Goal: ${goal.title}`, goal.id);
    }

    await dbRun(
      'UPDATE user_goals SET current_value = ?, status = ? WHERE id = ?',
      [currVal, status, goal.id]
    );
  }
}
