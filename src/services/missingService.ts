import { Client, EmbedBuilder, ColorResolvable, TextChannel } from 'discord.js';
import { getLatestOpenWipe, getAllAttendance } from './wipeService';
import { getAllPlayers } from './playerService';
import { getSetting, setSetting } from './settingsService';
import { config } from '../config';
import { logger } from '../utils/logger';

const SETTING_KEY = 'missing_panel';

/**
 * Builds the "not responded yet" panel for the latest open wipe.
 * Pool of expected people = all registered players.
 */
export function buildMissingEmbed(guildId: string): EmbedBuilder {
  const color = `#${config.embedColor}` as ColorResolvable;
  const wipe = getLatestOpenWipe(guildId);

  if (!wipe) {
    return new EmbedBuilder()
      .setColor(color)
      .setTitle('⏳ Not Responded')
      .setDescription('*No active wipe right now.*')
      .setTimestamp();
  }

  const responded = new Set(getAllAttendance(wipe.id).map((r) => r.user_id));
  const players = getAllPlayers();
  const missing = players.filter((p) => !responded.has(p.user_id));

  const list = missing.length
    ? missing.map((p) => `• <@${p.user_id}>`).join('\n')
    : '✅ Everyone has responded!';

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`⏳ Not Responded — ${wipe.server_name}`)
    .setDescription(
      `**${wipe.wipe_date} ${wipe.wipe_time}** (${config.timezone})\n\n` +
      `These registered members haven't reacted yet (**${missing.length}**):\n\n${list}`,
    )
    .setFooter({ text: `${responded.size} responded • ${missing.length} pending` })
    .setTimestamp();
}

/** Posts a fresh panel in the configured channel and stores its message id. */
export async function postMissingPanel(client: Client, guildId: string): Promise<boolean> {
  try {
    const channel = await client.channels.fetch(config.missingPanelChannelId) as TextChannel | null;
    if (!channel) return false;
    const message = await channel.send({ embeds: [buildMissingEmbed(guildId)] });
    setSetting(SETTING_KEY, `${channel.id}:${message.id}:${guildId}`);
    return true;
  } catch (err) {
    logger.warn('Could not post missing panel:', err);
    return false;
  }
}

/** Edits the existing panel, if one was posted. */
export async function refreshMissingPanel(client: Client): Promise<void> {
  const stored = getSetting(SETTING_KEY);
  if (!stored) return;

  try {
    const [channelId, messageId, guildId] = stored.split(':');
    const channel = await client.channels.fetch(channelId) as TextChannel | null;
    if (!channel) return;
    const message = await channel.messages.fetch(messageId);
    await message.edit({ embeds: [buildMissingEmbed(guildId)] });
  } catch (err) {
    logger.warn('Could not refresh missing panel:', err);
  }
}
