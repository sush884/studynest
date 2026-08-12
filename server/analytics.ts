import { dbQuery, dbGet } from './db';
import { calculateAndSyncUserStreak } from './gamification';

function formatDurationHuman(seconds: number): string {
  if (seconds <= 0) return '0 min';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export async function getPersonalAnalytics(
  userId: string,
  timeRange: string = 'week',
  customStartDate?: string,
  customEndDate?: string
) {
  const now = new Date();
  let startDateStr = '1970-01-01';
  let endDateStr = '2099-12-31';

  const todayStr = now.toISOString().split('T')[0];

  if (timeRange === 'today') {
    startDateStr = todayStr;
    endDateStr = todayStr;
  } else if (timeRange === 'week') {
    const dayOfWeek = now.getDay(); // 0 is Sunday
    const distanceToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const mon = new Date(now);
    mon.setDate(now.getDate() - distanceToMon);
    startDateStr = mon.toISOString().split('T')[0];
  } else if (timeRange === 'month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    startDateStr = firstDay.toISOString().split('T')[0];
  } else if (timeRange === '30days') {
    const d30 = new Date(now);
    d30.setDate(now.getDate() - 30);
    startDateStr = d30.toISOString().split('T')[0];
  } else if (timeRange === 'year') {
    const firstDayYear = new Date(now.getFullYear(), 0, 1);
    startDateStr = firstDayYear.toISOString().split('T')[0];
  } else if (timeRange === 'custom' && customStartDate && customEndDate) {
    startDateStr = customStartDate;
    endDateStr = customEndDate;
  }

  // 1. Total Study Time in range
  const rangeLogs = await dbQuery(
    `SELECT * FROM study_activity_logs
     WHERE user_id = ? AND date_str >= ? AND date_str <= ?
     ORDER BY completed_at ASC`,
    [userId, startDateStr, endDateStr]
  );

  const totalStudySecondsInRange = rangeLogs.reduce((sum, log) => sum + log.duration_seconds, 0);

  // Summary Comparisons: This Week, This Month, All Time
  const weekStart = new Date(now);
  const dayOfWeek = now.getDay();
  weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const monthStartStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const thisWeekLogs = await dbQuery(
    'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM study_activity_logs WHERE user_id = ? AND date_str >= ?',
    [userId, weekStartStr]
  );
  const thisMonthLogs = await dbQuery(
    'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM study_activity_logs WHERE user_id = ? AND date_str >= ?',
    [userId, monthStartStr]
  );
  const allTimeLogs = await dbQuery(
    'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM study_activity_logs WHERE user_id = ?',
    [userId]
  );

  const thisWeekSeconds = Number(thisWeekLogs[0]?.total || 0);
  const thisMonthSeconds = Number(thisMonthLogs[0]?.total || 0);
  const allTimeSeconds = Number(allTimeLogs[0]?.total || 0);

  // 2. Videos Completed & Assigned
  const allAssignedVids = await dbQuery(
    `SELECT v.* FROM day_videos v
     JOIN study_plans p ON v.plan_id = p.id
     WHERE p.user_id = ?`,
    [userId]
  );
  const totalAssignedCount = allAssignedVids.length;

  const completedVidsInRange = rangeLogs.length; // videos logged in time range
  const totalCompletedVidsAllTime = allAssignedVids.filter((v) => Boolean(v.completed)).length;
  const videosRemaining = Math.max(0, totalAssignedCount - totalCompletedVidsAllTime);

  const completionRate = totalAssignedCount > 0 ? Math.round((totalCompletedVidsAllTime / totalAssignedCount) * 100) : 0;

  // 3. Study Days count in time range
  const uniqueDatesInRange = new Set(rangeLogs.map((l) => l.date_str));
  const studyDaysCount = uniqueDatesInRange.size;

  // 4. Streaks
  const streakInfo = await calculateAndSyncUserStreak(userId);

  // 5. Courses Completed
  const userPlans = await dbQuery('SELECT * FROM study_plans WHERE user_id = ?', [userId]);
  let coursesCompletedCount = 0;
  const courseAnalyticsList = [];

  for (const plan of userPlans) {
    const planVids = await dbQuery('SELECT * FROM day_videos WHERE plan_id = ?', [plan.id]);
    const planTotalVids = planVids.length;
    const planCompletedVids = planVids.filter((v) => Boolean(v.completed)).length;
    const isPlanCompleted = planTotalVids > 0 && planCompletedVids === planTotalVids;
    if (isPlanCompleted) coursesCompletedCount++;

    const planTotalSecs = plan.total_duration_seconds || planVids.reduce((sum, v) => sum + v.duration_seconds, 0);
    const planCompletedSecs = planVids.filter((v) => Boolean(v.completed)).reduce((sum, v) => sum + v.duration_seconds, 0);
    const planProgress = planTotalVids > 0 ? Math.round((planCompletedVids / planTotalVids) * 100) : 0;

    courseAnalyticsList.push({
      courseId: plan.id,
      title: plan.title,
      thumbnailUrl: plan.thumbnail_url,
      totalVideos: planTotalVids,
      completedVideos: planCompletedVids,
      remainingVideos: Math.max(0, planTotalVids - planCompletedVids),
      totalDurationFormatted: formatDurationHuman(planTotalSecs),
      completedDurationFormatted: formatDurationHuman(planCompletedSecs),
      progressPercent: planProgress,
      isCompleted: isPlanCompleted,
    });
  }

  // 6. Average Daily Study Time (minutes)
  const avgDailyMinutes = studyDaysCount > 0 ? Math.round((totalStudySecondsInRange / 60) / studyDaysCount) : 0;

  // 7. Daily Study Graph Data (for line / bar charts)
  const dailyGraphData = [];
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (timeRange === 'week' || timeRange === 'today') {
    // Generate 7 days for current week (Mon..Sun)
    const curMon = new Date(now);
    const dow = now.getDay();
    curMon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));

    for (let i = 0; i < 7; i++) {
      const d = new Date(curMon);
      d.setDate(curMon.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const dayName = daysOfWeek[i];

      const dayLogs = rangeLogs.filter((l) => l.date_str === dStr);
      const daySecs = dayLogs.reduce((sum, l) => sum + l.duration_seconds, 0);

      dailyGraphData.push({
        date: dStr,
        day: dayName,
        minutes: Math.round(daySecs / 60),
        videoCount: dayLogs.length,
      });
    }
  } else {
    // Group by dates
    const dateMap = new Map<string, number>();
    for (const log of rangeLogs) {
      dateMap.set(log.date_str, (dateMap.get(log.date_str) || 0) + log.duration_seconds);
    }
    const sortedDates = Array.from(dateMap.keys()).sort();
    for (const dStr of sortedDates) {
      const daySecs = dateMap.get(dStr) || 0;
      dailyGraphData.push({
        date: dStr,
        day: dStr.slice(5), // MM-DD
        minutes: Math.round(daySecs / 60),
        videoCount: rangeLogs.filter((l) => l.date_str === dStr).length,
      });
    }
  }

  // 8. Weekly Report
  const bestDayInWeek = dailyGraphData.reduce(
    (max, d) => (d.minutes > max.minutes ? d : max),
    { day: 'N/A', minutes: 0 }
  );

  const weeklyReport = {
    totalStudyTimeFormatted: formatDurationHuman(thisWeekSeconds),
    videosCompleted: rangeLogs.length,
    studyDays: `${studyDaysCount} / 7`,
    avgDailyMinutes: Math.round((thisWeekSeconds / 60) / Math.max(1, studyDaysCount)),
    currentStreak: streakInfo.currentStreak,
    bestDay: bestDayInWeek.minutes > 0 ? `${bestDayInWeek.day} — ${bestDayInWeek.minutes} min` : 'None yet',
  };

  // 9. Monthly Report
  const monthlyReport = {
    monthName: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
    totalStudyTimeFormatted: formatDurationHuman(thisMonthSeconds),
    videosCompleted: totalCompletedVidsAllTime,
    studyDays: uniqueDatesInRange.size,
    longestStreak: streakInfo.longestStreak,
    avgDailyMinutes: Math.round((thisMonthSeconds / 60) / Math.max(1, uniqueDatesInRange.size)),
  };

  return {
    timeRange,
    totalStudyTimeFormatted: formatDurationHuman(totalStudySecondsInRange),
    totalStudySeconds: totalStudySecondsInRange,
    summaryComparison: {
      thisWeek: formatDurationHuman(thisWeekSeconds),
      thisMonth: formatDurationHuman(thisMonthSeconds),
      allTime: formatDurationHuman(allTimeSeconds),
    },
    videosCompleted: completedVidsInRange,
    totalCompletedVideosAllTime: totalCompletedVidsAllTime,
    videosRemaining,
    totalAssignedCount,
    completionRatePercent: completionRate,
    studyDays: studyDaysCount,
    currentStreak: streakInfo.currentStreak,
    longestStreak: streakInfo.longestStreak,
    coursesCompleted: coursesCompletedCount,
    averageDailyMinutes: avgDailyMinutes,
    courses: courseAnalyticsList,
    dailyGraph: dailyGraphData,
    weeklyReport,
    monthlyReport,
  };
}

export async function getCourseDetailAnalytics(userId: string, courseId: string) {
  const plan = await dbGet('SELECT * FROM study_plans WHERE id = ? AND user_id = ?', [courseId, userId]);
  if (!plan) return null;

  const planVids = await dbQuery('SELECT * FROM day_videos WHERE plan_id = ? ORDER BY position ASC', [courseId]);
  const totalVideos = planVids.length;
  const completedVids = planVids.filter((v) => Boolean(v.completed));
  const completedCount = completedVids.length;
  const remainingCount = Math.max(0, totalVideos - completedCount);

  const totalTimeSecs = plan.total_duration_seconds || planVids.reduce((sum, v) => sum + v.duration_seconds, 0);
  const completedTimeSecs = completedVids.reduce((sum, v) => sum + v.duration_seconds, 0);
  const progressPercent = totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0;

  // Logs for this course
  const courseLogs = await dbQuery(
    `SELECT * FROM study_activity_logs
     WHERE user_id = ? AND plan_id = ?
     ORDER BY completed_at DESC`,
    [userId, courseId]
  );

  const uniqueStudyDays = new Set(courseLogs.map((l) => l.date_str)).size;
  const totalLoggedSecs = courseLogs.reduce((sum, l) => sum + l.duration_seconds, 0);
  const avgDailyMinutes = uniqueStudyDays > 0 ? Math.round((totalLoggedSecs / 60) / uniqueStudyDays) : 0;

  // Longest session duration
  const longestSessionSecs = courseLogs.reduce((max, l) => (l.duration_seconds > max ? l.duration_seconds : max), 0);

  return {
    courseId: plan.id,
    title: plan.title,
    channelTitle: plan.channel_title,
    thumbnailUrl: plan.thumbnail_url,
    totalVideos,
    completedVideos: completedCount,
    remainingVideos: remainingCount,
    totalStudyTimeFormatted: formatDurationHuman(totalTimeSecs),
    completedStudyTimeFormatted: formatDurationHuman(completedTimeSecs),
    progressPercent,
    studyDays: uniqueStudyDays,
    averageDailyMinutes: avgDailyMinutes,
    longestSessionFormatted: formatDurationHuman(longestSessionSecs),
    recentActivity: courseLogs.slice(0, 10).map((log) => ({
      id: log.id,
      videoId: log.video_id,
      completedAt: log.completed_at,
      durationFormatted: formatDurationHuman(log.duration_seconds),
    })),
  };
}

export async function getStudyCalendar(userId: string, year: number, month: number) {
  // Month is 1-indexed (1 = Jan, 8 = Aug)
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStr = month < 10 ? `0${month}` : `${month}`;

  const startDateStr = `${year}-${monthStr}-01`;
  const endDateStr = `${year}-${monthStr}-${daysInMonth < 10 ? '0' + daysInMonth : daysInMonth}`;

  // Fetch user logs for month
  const monthLogs = await dbQuery(
    `SELECT * FROM study_activity_logs
     WHERE user_id = ? AND date_str >= ? AND date_str <= ?`,
    [userId, startDateStr, endDateStr]
  );

  const streakInfo = await calculateAndSyncUserStreak(userId);

  const calendarDays = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dayPad = day < 10 ? `0${day}` : `${day}`;
    const dateStr = `${year}-${monthStr}-${dayPad}`;

    const dayLogs = monthLogs.filter((l) => l.date_str === dateStr);
    const dayTotalSecs = dayLogs.reduce((sum, l) => sum + l.duration_seconds, 0);
    const dayMins = Math.round(dayTotalSecs / 60);
    const videosCount = dayLogs.length;

    let status = 'not_started';
    let goalCompleted = false;

    if (videosCount > 0) {
      if (dayMins >= 30) {
        status = 'completed';
        goalCompleted = true;
      } else {
        status = 'partially_completed';
      }
    }

    calendarDays.push({
      dateStr,
      dayNumber: day,
      studyMinutes: dayMins,
      videosCount,
      goalCompleted,
      status,
    });
  }

  return {
    year,
    month,
    daysInMonth,
    days: calendarDays,
    currentStreak: streakInfo.currentStreak,
  };
}

export async function getDayDetails(userId: string, dateStr: string) {
  const logs = await dbQuery(
    `SELECT l.*, v.title as video_title, p.title as plan_title
     FROM study_activity_logs l
     LEFT JOIN day_videos v ON l.video_id = v.id
     LEFT JOIN study_plans p ON l.plan_id = p.id
     WHERE l.user_id = ? AND l.date_str = ?
     ORDER BY l.completed_at DESC`,
    [userId, dateStr]
  );

  const totalSecs = logs.reduce((sum, l) => sum + l.duration_seconds, 0);

  return {
    dateStr,
    totalMinutes: Math.round(totalSecs / 60),
    totalDurationFormatted: formatDurationHuman(totalSecs),
    completedVideosCount: logs.length,
    videos: logs.map((l) => ({
      id: l.id,
      title: l.video_title || 'Completed Study Video',
      courseTitle: l.plan_title || 'Self Study',
      durationFormatted: formatDurationHuman(l.duration_seconds),
      completedAt: l.completed_at,
    })),
  };
}

export async function getStudyHistory(userId: string) {
  const logs = await dbQuery(
    `SELECT l.*, v.title as video_title, p.title as plan_title
     FROM study_activity_logs l
     LEFT JOIN day_videos v ON l.video_id = v.id
     LEFT JOIN study_plans p ON l.plan_id = p.id
     WHERE l.user_id = ?
     ORDER BY l.completed_at DESC
     LIMIT 50`,
    [userId]
  );

  return logs.map((l) => ({
    id: l.id,
    videoTitle: l.video_title || 'Completed Video',
    courseTitle: l.plan_title || 'Study Session',
    durationFormatted: formatDurationHuman(l.duration_seconds),
    completedAt: l.completed_at,
    dateStr: l.date_str,
  }));
}

export async function getGroupAnalytics(groupId: string, userId: string) {
  // Authorization check
  const member = await dbGet('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
  if (!member) {
    throw new Error('Unauthorized: You are not a member of this study group.');
  }

  const group = await dbGet('SELECT * FROM groups WHERE id = ?', [groupId]);
  const members = await dbQuery(
    `SELECT m.*, u.name, u.email, u.avatar_url, u.current_streak
     FROM group_members m
     JOIN users u ON m.user_id = u.id
     WHERE m.group_id = ?`,
    [groupId]
  );

  const memberIds = members.map((m) => m.user_id);
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  let totalGroupStudySeconds = 0;
  const memberPerformance = [];

  let completedTodayCount = 0;

  for (const m of members) {
    const userLogs = await dbQuery(
      'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM study_activity_logs WHERE user_id = ?',
      [m.user_id]
    );
    const userSecs = Number(userLogs[0]?.total || 0);
    totalGroupStudySeconds += userSecs;

    // Check today's study
    const todayLogs = await dbQuery(
      'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM study_activity_logs WHERE user_id = ? AND date_str = ?',
      [m.user_id, todayStr]
    );
    const todayMins = Math.round(Number(todayLogs[0]?.total || 0) / 60);
    const targetMins = group.daily_target_minutes || 60;
    const completedToday = todayMins >= targetMins;
    if (completedToday) completedTodayCount++;

    // User's plan progress
    const userVids = await dbQuery(
      `SELECT v.* FROM day_videos v
       JOIN study_plans p ON v.plan_id = p.id
       WHERE p.user_id = ?`,
      [m.user_id]
    );
    const completedCount = userVids.filter((v) => Boolean(v.completed)).length;
    const progressPercent = userVids.length > 0 ? Math.round((completedCount / userVids.length) * 100) : 0;

    memberPerformance.push({
      userId: m.user_id,
      userName: m.name,
      userEmail: m.email,
      avatarUrl: m.avatar_url,
      progressPercent,
      totalStudyTimeFormatted: formatDurationHuman(userSecs),
      streak: m.current_streak || 0,
      completedToday,
      todayStudyMinutes: todayMins,
      liveStatus: m.live_status || 'not_started',
    });
  }

  const avgMemberProgress = members.length > 0
    ? Math.round(memberPerformance.reduce((sum, m) => sum + m.progressPercent, 0) / members.length)
    : 0;

  const todayParticipationPercent = members.length > 0
    ? Math.round((completedTodayCount / members.length) * 100)
    : 0;

  // Group weekly participation by day of week
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const curMon = new Date(now);
  const dow = now.getDay();
  curMon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));

  const groupWeeklyParticipation = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(curMon);
    d.setDate(curMon.getDate() + i);
    const dStr = d.toISOString().split('T')[0];

    let dayParticipants = 0;
    for (const mId of memberIds) {
      const logs = await dbQuery(
        'SELECT id FROM study_activity_logs WHERE user_id = ? AND date_str = ? LIMIT 1',
        [mId, dStr]
      );
      if (logs.length > 0) dayParticipants++;
    }

    const partPercent = members.length > 0 ? Math.round((dayParticipants / members.length) * 100) : 0;
    groupWeeklyParticipation.push({
      day: daysOfWeek[i],
      dateStr: dStr,
      participationPercent: partPercent,
      activeMembersCount: dayParticipants,
    });
  }

  return {
    groupId,
    groupName: group.name,
    totalGroupStudyTimeFormatted: formatDurationHuman(totalGroupStudySeconds),
    averageMemberProgressPercent: avgMemberProgress,
    todayParticipation: {
      completedCount: completedTodayCount,
      totalMembers: members.length,
      participationPercent: todayParticipationPercent,
    },
    groupStreak: group.group_streak || 0,
    longestGroupStreak: group.longest_group_streak || 0,
    weeklyParticipation: groupWeeklyParticipation,
    members: memberPerformance,
  };
}

export async function getGroupLeaderboard(groupId: string, userId: string, timeframe: string = 'all') {
  // Authorization check
  const isMember = await dbGet('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
  if (!isMember) {
    throw new Error('Unauthorized: You cannot access the leaderboard of a group you are not a member of.');
  }

  const members = await dbQuery(
    `SELECT m.user_id, u.name, u.email, u.avatar_url
     FROM group_members m
     JOIN users u ON m.user_id = u.id
     WHERE m.group_id = ?`,
    [groupId]
  );

  const leaderboardList = [];

  for (const m of members) {
    // XP
    const xpRow = await dbGet('SELECT COALESCE(SUM(amount), 0) as total FROM xp_transactions WHERE user_id = ?', [m.user_id]);
    const xp = Number(xpRow?.total || 0);

    // Study time
    const timeRow = await dbGet('SELECT COALESCE(SUM(duration_seconds), 0) as total FROM study_activity_logs WHERE user_id = ?', [m.user_id]);
    const studySecs = Number(timeRow?.total || 0);

    // Study days
    const daysRow = await dbGet('SELECT COUNT(DISTINCT date_str) as count FROM study_activity_logs WHERE user_id = ?', [m.user_id]);
    const studyDays = Number(daysRow?.count || 0);

    // Streak
    const streakInfo = await calculateAndSyncUserStreak(m.user_id);

    leaderboardList.push({
      userId: m.user_id,
      name: m.name,
      avatarUrl: m.avatar_url,
      xp,
      totalStudyTimeFormatted: formatDurationHuman(studySecs),
      studySeconds: studySecs,
      studyDays,
      currentStreak: streakInfo.currentStreak,
    });
  }

  // Sort ranking: 1. XP -> 2. studySeconds -> 3. studyDays
  leaderboardList.sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    if (b.studySeconds !== a.studySeconds) return b.studySeconds - a.studySeconds;
    return b.studyDays - a.studyDays;
  });

  return leaderboardList.map((item, index) => ({
    rank: index + 1,
    ...item,
  }));
}
