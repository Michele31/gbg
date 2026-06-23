import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  TextChannel,
} from 'discord.js';
import { setVip, getWipeById } from './wipeService';
import { buildWipeEmbed } from '../utils/embeds';
import { buildAttendanceRow } from '../commands/wipe';
import { logger } from '../utils/logger';

export function buildVipRow(wipeId: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`vip:yes:${wipeId}`)
      .setLabel('Yes, I have VIP')
      .setEmoji('👑')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`vip:no:${wipeId}`)
      .setLabel('No VIP')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary),
  );
}

export async function handleVipButton(interaction: ButtonInteraction): Promise<void> {
  const [, answer, wipeIdStr] = interaction.customId.split(':');
  const wipeId = parseInt(wipeIdStr, 10);
  const hasVip = answer === 'yes';

  setVip(wipeId, interaction.user.id, hasVip);

  // Dismiss the VIP popup
  await interaction.update({
    content: hasVip ? '👑 VIP confirmed!' : '✅ Got it — no VIP.',
    components: [],
  });

  // Refresh the wipe embed so VIP count updates live
  const wipe = getWipeById(wipeId);
  if (!wipe) return;

  try {
    const channel = interaction.client.channels.cache.get(wipe.channel_id) as TextChannel | undefined;
    if (!channel) return;
    const message = await channel.messages.fetch(wipe.message_id);
    await message.edit({
      embeds: [buildWipeEmbed(wipe)],
      components: [buildAttendanceRow(wipeId, wipe.closed === 1)],
    });
  } catch (err) {
    logger.warn('Could not refresh wipe embed after VIP answer:', err);
  }

  logger.info(`VIP answered by ${interaction.user.username}: ${hasVip} for wipe #${wipeId}`);
}
