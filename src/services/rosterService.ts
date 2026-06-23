import { Client, EmbedBuilder, ColorResolvable, TextChannel } from 'discord.js';
import { getAllPlayers } from './playerService';
import { getSetting } from './settingsService';
import { config } from '../config';
import { logger } from '../utils/logger';

export function buildRosterEmbeds(): EmbedBuilder[] {
  const players = getAllPlayers();
  const color = `#${config.embedColor}` as ColorResolvable;

  if (players.length === 0) {
    return [
      new EmbedBuilder()
        .setColor(color)
        .setTitle('👥 Clan Roster')
        .setDescription('*No members registered yet.*')
        .setTimestamp(),
    ];
  }

  const lines = players.map(
    (p) => `**${p.username.toUpperCase()}**\n[Steam](${p.steam}) • [BattleMetrics](${p.bm})`,
  );

  const chunkSize = 10;
  const embeds: EmbedBuilder[] = [];
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    embeds.push(
      new EmbedBuilder()
        .setColor(color)
        .setTitle(i === 0 ? `👥 Clan Roster — ${players.length} member${players.length !== 1 ? 's' : ''}` : '​')
        .setDescription(chunk.join('\n\n'))
        .setTimestamp(i + chunkSize >= lines.length ? new Date() : undefined),
    );
  }
  return embeds;
}

/** Edits the pinned roster message, if one exists. */
export async function refreshRoster(client: Client): Promise<void> {
  const stored = getSetting('roster_message');
  if (!stored) return;

  try {
    const [channelId, messageId] = stored.split(':');
    const channel = await client.channels.fetch(channelId) as TextChannel | null;
    if (!channel) return;

    const message = await channel.messages.fetch(messageId);
    await message.edit({ embeds: buildRosterEmbeds() });
  } catch (err) {
    logger.warn('Could not refresh roster message:', err);
  }
}

/** Sends a join notification to the configured channel. */
export async function sendJoinNotification(client: Client, username: string, userId: string): Promise<void> {
  try {
    const channel = await client.channels.fetch(config.joinNotificationChannelId) as TextChannel | null;
    if (!channel) return;
    await channel.send(`📢 **@${username.toUpperCase()} HAS JOINED GBG — BE SURE TO ADD HIM** <@${userId}>`);
  } catch (err) {
    logger.warn('Could not send join notification:', err);
  }
}
