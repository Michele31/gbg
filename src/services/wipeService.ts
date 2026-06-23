import { getDb } from '../database';
import { WipeRow, AttendanceRow, AttendanceStatus } from '../database/types';

// ─── Wipes ────────────────────────────────────────────────────────────────────

export function createWipe(data: {
  guild_id: string;
  channel_id: string;
  message_id: string;
  wipe_date: string;
  wipe_time: string;
  server_name: string;
  notes?: string;
  created_by: string;
  created_by_tag?: string;
}): WipeRow {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO wipes (guild_id, channel_id, message_id, wipe_date, wipe_time, server_name, notes, created_by, created_by_tag)
    VALUES (@guild_id, @channel_id, @message_id, @wipe_date, @wipe_time, @server_name, @notes, @created_by, @created_by_tag)
  `);
  const result = stmt.run({ ...data, notes: data.notes ?? null, created_by_tag: data.created_by_tag ?? null });
  return getWipeById(result.lastInsertRowid as number)!;
}

export function getWipeById(id: number): WipeRow | undefined {
  return getDb().prepare('SELECT * FROM wipes WHERE id = ?').get(id) as WipeRow | undefined;
}

export function getWipeByMessageId(messageId: string): WipeRow | undefined {
  return getDb()
    .prepare('SELECT * FROM wipes WHERE message_id = ?')
    .get(messageId) as WipeRow | undefined;
}

export function getLatestOpenWipe(guildId: string): WipeRow | undefined {
  return getDb()
    .prepare('SELECT * FROM wipes WHERE guild_id = ? AND closed = 0 ORDER BY id DESC LIMIT 1')
    .get(guildId) as WipeRow | undefined;
}

export function closeWipe(id: number): void {
  getDb().prepare('UPDATE wipes SET closed = 1 WHERE id = ?').run(id);
}

export function updateWipeMessageId(id: number, messageId: string): void {
  getDb().prepare('UPDATE wipes SET message_id = ? WHERE id = ?').run(messageId, id);
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export function upsertAttendance(data: {
  wipe_id: number;
  user_id: string;
  username: string;
  status: AttendanceStatus;
}): AttendanceRow {
  const db = getDb();
  db.prepare(`
    INSERT INTO attendance (wipe_id, user_id, username, status, vip, updated_at)
    VALUES (@wipe_id, @user_id, @username, @status, NULL, datetime('now'))
    ON CONFLICT(wipe_id, user_id) DO UPDATE SET
      username   = excluded.username,
      status     = excluded.status,
      vip        = NULL,
      updated_at = datetime('now')
  `).run(data);

  return getAttendance(data.wipe_id, data.user_id)!;
}

export function removeAttendance(wipeId: number, userId: string): void {
  getDb()
    .prepare('DELETE FROM attendance WHERE wipe_id = ? AND user_id = ?')
    .run(wipeId, userId);
}

export function setVip(wipeId: number, userId: string, vip: boolean): void {
  getDb()
    .prepare(`UPDATE attendance SET vip = ?, updated_at = datetime('now') WHERE wipe_id = ? AND user_id = ?`)
    .run(vip ? 1 : 0, wipeId, userId);
}

export function getAttendance(wipeId: number, userId: string): AttendanceRow | undefined {
  return getDb()
    .prepare('SELECT * FROM attendance WHERE wipe_id = ? AND user_id = ?')
    .get(wipeId, userId) as AttendanceRow | undefined;
}

export function getAllAttendance(wipeId: number): AttendanceRow[] {
  return getDb()
    .prepare('SELECT * FROM attendance WHERE wipe_id = ? ORDER BY updated_at ASC')
    .all(wipeId) as AttendanceRow[];
}

export function getAttendanceCounts(wipeId: number): { yes: number; vip: number; no: number; late: number } {
  const rows = getDb()
    .prepare(`SELECT status, COUNT(*) as cnt FROM attendance WHERE wipe_id = ? GROUP BY status`)
    .all(wipeId) as { status: string; cnt: number }[];

  const vipCount = (getDb()
    .prepare(`SELECT COUNT(*) as cnt FROM attendance WHERE wipe_id = ? AND vip = 1`)
    .get(wipeId) as { cnt: number }).cnt;

  const counts = { yes: 0, vip: vipCount, no: 0, late: 0 };
  for (const row of rows) {
    if (row.status === 'yes') counts.yes = row.cnt;
    else if (row.status === 'no') counts.no = row.cnt;
    else if (row.status === 'late') counts.late = row.cnt;
  }
  return counts;
}
