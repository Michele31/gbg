import {
  User,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  MessageFlags,
} from 'discord.js';
import { setVip } from './wipeService';
import { logger } from '../utils/logger';

/**
 * Sends a VIP question to the user via DM.
 * Falls back to a channel mention if DMs are closed.
 */
export async function askVip(
  user: User,
  wipeId: number,
  fallbackChannel: TextChannel,
): Promise<void> {
  const row = buildVipRow(wipeId);

  try {
    await user.send({
      content: '🎮 **Will you have VIP for this wipe?**',
      components: [row],
    });
  } catch {
    // DMs disabled — fall back to channel mention
    try {
      await fallbackChannel.send({
        content:
          `<@${user.id}> Your DMs are disabled! Please answer: **Will you have VIP?**`,
        components: [row],
      });
    } catch (err) {
      logger.error(`Failed to send VIP fallback message for user ${user.id}:`, err);
    }
  }
}

function buildVipRow(wipeId: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`vip:yes:${wipeId}`)
      .setLabel('Yes, I have VIP')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`vip:no:${wipeId}`)
      .setLabel('No VIP')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary),
  );
}

export async function handleVipButton(interaction: ButtonInteraction): Promise<void> {
  // customId format: vip:<yes|no>:<wipeId>
  const [, answer, wipeIdStr] = interaction.customId.split(':');
  const wipeId = parseInt(wipeIdStr, 10);
  const hasVip = answer === 'yes';

  setVip(wipeId, interaction.user.id, hasVip);

  await interaction.update({
    content: hasVip
      ? '✅ Got it — you have VIP!'
      : '❌ Got it — no VIP for this wipe.',
    components: [],
  });

  logger.info(`VIP answered by ${interaction.user.tag}: ${hasVip} for wipe #${wipeId}`);
}
