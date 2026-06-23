import { getDb } from '../database';
import { PlayerRow } from '../database/types';

export function upsertPlayer(data: {
  user_id: string;
  username: string;
  steam: string;
  bm: string;
}): PlayerRow {
  getDb().prepare(`
    INSERT INTO players (user_id, username, steam, bm, updated_at)
    VALUES (@user_id, @username, @steam, @bm, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      username   = excluded.username,
      steam      = excluded.steam,
      bm         = excluded.bm,
      updated_at = datetime('now')
  `).run(data);

  return getPlayer(data.user_id)!;
}

export function getPlayer(userId: string): PlayerRow | undefined {
  return getDb()
    .prepare('SELECT * FROM players WHERE user_id = ?')
    .get(userId) as PlayerRow | undefined;
}

export function getAllPlayers(): PlayerRow[] {
  return getDb()
    .prepare('SELECT * FROM players ORDER BY username ASC')
    .all() as PlayerRow[];
}

export function deletePlayer(userId: string): void {
  getDb().prepare('DELETE FROM players WHERE user_id = ?').run(userId);
}
