import { getDb } from '../database';
import { PlayerRow } from '../database/types';

export function upsertPlayer(data: {
  user_id: string;
  username: string;
  steam: string;
  bm: string;
  steamid64?: string | null;
}): PlayerRow {
  getDb().prepare(`
    INSERT INTO players (user_id, username, steam, bm, steamid64, updated_at)
    VALUES (@user_id, @username, @steam, @bm, @steamid64, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      username   = excluded.username,
      steam      = excluded.steam,
      bm         = excluded.bm,
      steamid64  = excluded.steamid64,
      updated_at = datetime('now')
  `).run({ ...data, steamid64: data.steamid64 ?? null });

  return getPlayer(data.user_id)!;
}

export function setSteamId64(userId: string, steamid64: string): void {
  getDb()
    .prepare(`UPDATE players SET steamid64 = ?, updated_at = datetime('now') WHERE user_id = ?`)
    .run(steamid64, userId);
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

export function updatePlayerUsername(userId: string, username: string): void {
  getDb()
    .prepare(`UPDATE players SET username = ?, updated_at = datetime('now') WHERE user_id = ?`)
    .run(username, userId);
}
