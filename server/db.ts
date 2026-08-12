import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.FUNCTIONS_WORKER_RUNTIME);
const dbPath = isServerless ? path.join('/tmp', 'studynest.db') : path.join(process.cwd(), 'studynest.db');

let db: Database;

const saveDB = () => {
  if (!db) return;
  try {
    if (!fs.existsSync(path.dirname(dbPath))) {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Failed to save DB:', err);
  }
};

const initDB = async () => {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.error('Error loading existing db file, creating new db:', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Schema creation
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      bio TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_completed_date TEXT,
      privacy_show_profile INTEGER DEFAULT 1,
      privacy_show_stats INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS study_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      playlist_url TEXT NOT NULL,
      playlist_id TEXT NOT NULL,
      channel_title TEXT,
      thumbnail_url TEXT,
      daily_target_minutes INTEGER DEFAULT 60,
      flexibility TEXT DEFAULT 'flexible',
      allow_video_splitting INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      total_videos INTEGER DEFAULT 0,
      total_duration_seconds INTEGER DEFAULT 0,
      total_duration_formatted TEXT DEFAULT '0m',
      estimated_days INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_days (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      day_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      target_minutes INTEGER DEFAULT 60,
      actual_duration_seconds INTEGER DEFAULT 0,
      actual_duration_formatted TEXT DEFAULT '0m',
      status TEXT DEFAULT 'not_started',
      completed_at TEXT,
      FOREIGN KEY (plan_id) REFERENCES study_plans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS day_videos (
      id TEXT PRIMARY KEY,
      day_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      youtube_video_id TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL,
      duration_formatted TEXT NOT NULL,
      thumbnail_url TEXT,
      position INTEGER DEFAULT 1,
      status TEXT DEFAULT 'not_started',
      started_at TEXT,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      FOREIGN KEY (day_id) REFERENCES study_days(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES study_plans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS video_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      status TEXT DEFAULT 'not_started',
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      study_plan_id TEXT,
      video_id TEXT,
      video_title TEXT,
      day_number INTEGER,
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT,
      item_ref_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      owner_id TEXT NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      study_plan_id TEXT,
      study_plan_title TEXT NOT NULL,
      daily_target_minutes INTEGER DEFAULT 60,
      required_participation_percent INTEGER DEFAULT 60,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at TEXT NOT NULL,
      live_status TEXT DEFAULT 'not_started',
      last_active TEXT,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS group_activities (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT,
      activity_type TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS group_chat_messages (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      channel_id TEXT DEFAULT 'general',
      sender_id TEXT NOT NULL,
      message TEXT NOT NULL,
      reply_to_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS message_reactions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      FOREIGN KEY (message_id) REFERENCES group_chat_messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(message_id, user_id, emoji)
    );

    CREATE TABLE IF NOT EXISTS daily_discussions (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      day_number INTEGER NOT NULL,
      learned_today TEXT NOT NULL,
      difficulty TEXT DEFAULT 'medium',
      doubt_question TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS friendships (
      id TEXT PRIMARY KEY,
      user_id_1 TEXT NOT NULL,
      user_id_2 TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id_1) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id_2) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id_1, user_id_2)
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      unlocked_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS chat_read_states (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      last_read_message_id TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      UNIQUE(user_id, group_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      related_group_id TEXT,
      related_message_id TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_reminders (
      user_id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      reminder_time TEXT DEFAULT '20:00',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT,
      video_id TEXT,
      day_id TEXT,
      duration_seconds INTEGER NOT NULL,
      completed_at TEXT NOT NULL,
      date_str TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      requirement_type TEXT NOT NULL,
      requirement_value INTEGER NOT NULL,
      category TEXT DEFAULT 'milestone'
    );

    CREATE TABLE IF NOT EXISTS xp_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      related_entity_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      target INTEGER NOT NULL,
      current_value INTEGER DEFAULT 0,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try { db.run("ALTER TABLE groups ADD COLUMN study_plan_id TEXT;"); } catch (e) {}
  try { db.run("ALTER TABLE groups ADD COLUMN status TEXT DEFAULT 'active';"); } catch (e) {}
  try { db.run("ALTER TABLE group_members ADD COLUMN role TEXT DEFAULT 'member';"); } catch (e) {}
  try { db.run("ALTER TABLE group_chat_messages ADD COLUMN deleted_at TEXT;"); } catch (e) {}
  try { db.run("ALTER TABLE group_chat_messages ADD COLUMN updated_at TEXT;"); } catch (e) {}

  // Seed default achievements if missing
  try {
    const achCount = db.prepare('SELECT COUNT(*) as cnt FROM achievements');
    achCount.step();
    const countVal = achCount.getAsObject().cnt as number;
    achCount.free();

    if (countVal === 0) {
      const defaultAch = [
        ['first_step', 'First Step', 'Complete your first video.', '🏆', 'completed_videos', 1, 'learning'],
        ['first_day', 'First Study Day', 'Complete your first daily target.', '🎯', 'completed_days', 1, 'learning'],
        ['streak_3', '3 Day Streak', 'Study for 3 consecutive qualifying days.', '🔥', 'streak_days', 3, 'streak'],
        ['streak_7', '7 Day Streak', 'Study for 7 consecutive qualifying days.', '⚡', 'streak_days', 7, 'streak'],
        ['streak_14', '14 Day Streak', 'Study for 14 consecutive qualifying days.', '🌟', 'streak_days', 14, 'streak'],
        ['streak_30', '30 Day Streak', 'Study for 30 consecutive qualifying days.', '👑', 'streak_days', 30, 'streak'],
        ['videos_10', '10 Videos', 'Complete 10 videos.', '📚', 'completed_videos', 10, 'milestone'],
        ['videos_50', '50 Videos', 'Complete 50 videos.', '🎓', 'completed_videos', 50, 'milestone'],
        ['videos_100', '100 Videos', 'Complete 100 videos.', '🚀', 'completed_videos', 100, 'milestone'],
        ['hours_5', '5 Hours', 'Study for 5 total hours.', '⌛', 'total_study_seconds', 18000, 'milestone'],
        ['hours_10', '10 Hours', 'Study for 10 total hours.', '⏳', 'total_study_seconds', 36000, 'milestone'],
        ['course_complete', 'Course Complete', 'Finish an entire study plan.', '🎉', 'courses_completed', 1, 'milestone'],
      ];

      for (const [id, name, desc, icon, reqType, reqVal, cat] of defaultAch) {
        db.run(
          `INSERT INTO achievements (id, name, description, icon, requirement_type, requirement_value, category)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, name, desc, icon, reqType, reqVal, cat]
        );
      }
    }
  } catch (err) {
    console.error('Failed to seed achievements:', err);
  }

  saveDB();
};

const dbReady = initDB();

export const dbQuery = async (sql: string, params: any[] = []): Promise<any[]> => {
  await dbReady;
  try {
    const stmt = db.prepare(sql);
    if (params && params.length > 0) {
      stmt.bind(params);
    }
    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('dbQuery Error:', err, 'SQL:', sql, 'Params:', params);
    return [];
  }
};

export const dbGet = async (sql: string, params: any[] = []): Promise<any> => {
  const rows = await dbQuery(sql, params);
  return rows[0] || null;
};

export const dbRun = async (sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> => {
  await dbReady;
  try {
    db.run(sql, params);
    const modified = db.getRowsModified();
    saveDB();
    return { changes: modified };
  } catch (err) {
    console.error('dbRun Error:', err, 'SQL:', sql, 'Params:', params);
    throw err;
  }
};

export default { dbQuery, dbGet, dbRun };
