import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialised — call initDatabase() first');
  return db;
}

export function initDatabase(): void {
  const dbPath = config.databasePath;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);
  logger.info(`Database initialised at ${dbPath}`);
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wipes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id    TEXT    NOT NULL,
      channel_id  TEXT    NOT NULL,
      message_id  TEXT    NOT NULL,
      wipe_date   TEXT    NOT NULL,
      wipe_time   TEXT    NOT NULL,
      server_name TEXT    NOT NULL,
      notes       TEXT,
      closed          INTEGER NOT NULL DEFAULT 0,
      created_by      TEXT    NOT NULL,
      created_by_tag  TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      wipe_id    INTEGER NOT NULL REFERENCES wipes(id) ON DELETE CASCADE,
      user_id    TEXT    NOT NULL,
      username   TEXT    NOT NULL,
      status     TEXT    NOT NULL CHECK(status IN ('yes','no','late')),
      vip        INTEGER,              -- NULL = not yet answered, 0 = no, 1 = yes
      updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(wipe_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS players (
      user_id     TEXT PRIMARY KEY,
      username    TEXT NOT NULL,
      steam       TEXT NOT NULL,
      bm          TEXT NOT NULL,
      registered_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
