import { Client, EmbedBuilder, ColorResolvable, TextChannel, User } from 'discord.js';
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

export async function sendJoinNotification(
  client: Client,
  user: User,
  displayName: string,
  steam: string,
): Promise<void> {
  try {
    const channel = await client.channels.fetch(config.joinNotificationChannelId) as TextChannel | null;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle(`📥 ${displayName.toUpperCase()} HAS JOINED GBG`)
      .setDescription('Be sure to **add him and rename him** on Steam!')
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Discord', value: `<@${user.id}>`, inline: true },
        { name: 'Steam', value: `[Profile](${steam})`, inline: true },
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.warn('Could not send join notification:', err);
  }
}

export async function sendLeaveNotification(
  client: Client,
  user: User,
  displayName: string,
  steam: string,
): Promise<void> {
  try {
    const channel = await client.channels.fetch(config.joinNotificationChannelId) as TextChannel | null;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle(`📤 ${displayName.toUpperCase()} HAS LEFT GBG`)
      .setDescription('Be sure to **unfriend / rename** him!')
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Discord', value: `<@${user.id}>`, inline: true },
        { name: 'Steam', value: `[Profile](${steam})`, inline: true },
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.warn('Could not send leave notification:', err);
  }
}
