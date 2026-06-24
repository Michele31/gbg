import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const config = {
  token: requireEnv('DISCORD_TOKEN'),
  clientId: requireEnv('CLIENT_ID'),
  guildId: process.env.GUILD_ID ?? null,

  // Roles allowed to run /wipe
  allowedRoles: (process.env.ALLOWED_ROLES ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean),

  // Role mentioned in the wipe embed
  teamRoleId: process.env.TEAM_ROLE_ID ?? null,

  embedColor: (process.env.EMBED_COLOR ?? 'FF4500') as `${string}`,
  serverName: process.env.SERVER_NAME ?? 'Rusticated EU Main',
  timezone: process.env.TIMEZONE ?? 'UTC',
  databasePath: process.env.DATABASE_PATH ?? './data/bot.db',
  joinNotificationChannelId: process.env.JOIN_NOTIFICATION_CHANNEL_ID ?? '1518998258171511017',
  missingPanelChannelId: process.env.MISSING_PANEL_CHANNEL_ID ?? '1519398092149882890',
} as const;
