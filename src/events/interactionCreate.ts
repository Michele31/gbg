import {
  Client,
  Events,
  Interaction,
  ButtonInteraction,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { commands } from '../commands';
import { handleVipButton, askVip } from '../services/vipService';
import {
  getWipeByMessageId,
  upsertAttendance,
  removeAttendance,
  getAttendance,
  getWipeById,
} from '../services/wipeService';
import { buildWipeEmbed } from '../utils/embeds';
import { logger } from '../utils/logger';
import { AttendanceStatus } from '../database/types';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(_client: Client, interaction: Interaction): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction);
    }
  } catch (err) {
    logger.error('Unhandled interaction error:', err);

    const reply = { content: '❌ An unexpected error occurred.', ephemeral: true };
    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => null);
      } else {
        await interaction.reply(reply).catch(() => null);
      }
    }
  }
}

async function handleButton(interaction: ButtonInteraction): Promise<void> {
  const [category, action, idStr] = interaction.customId.split(':');

  // ── VIP buttons ──────────────────────────────────────────────────────────
  if (category === 'vip') {
    await handleVipButton(interaction);
    return;
  }

  // ── Attendance buttons ────────────────────────────────────────────────────
  if (category === 'attendance') {
    const wipeId = parseInt(idStr, 10);
    const wipe = getWipeById(wipeId);

    if (!wipe) {
      await interaction.reply({ content: '❌ Wipe not found.', ephemeral: true });
      return;
    }

    if (wipe.closed) {
      await interaction.reply({ content: '🔒 This wipe is closed — attendance is no longer tracked.', ephemeral: true });
      return;
    }

    const status = action as AttendanceStatus;
    const existing = getAttendance(wipeId, interaction.user.id);

    if (existing && existing.status === status) {
      // Toggle off — remove attendance
      removeAttendance(wipeId, interaction.user.id);
      await interaction.reply({ content: `↩️ Removed your attendance.`, ephemeral: true });
    } else {
      upsertAttendance({
        wipe_id: wipeId,
        user_id: interaction.user.id,
        username: interaction.user.username,
        status,
      });

      const label = status === 'yes' ? '✅ Yes' : status === 'no' ? '❌ No' : '⏰ Late';
      await interaction.reply({ content: `${label} — attendance recorded!`, ephemeral: true });

      // Ask VIP if attending (yes or late)
      if (status === 'yes' || status === 'late') {
        const channel = interaction.channel as TextChannel | null;
        if (channel) {
          await askVip(interaction.user, wipeId, channel);
        }
      }
    }

    // Update the wipe embed footer with live counts
    await refreshWipeEmbed(interaction, wipe.message_id, wipeId);
    return;
  }
}

async function refreshWipeEmbed(
  interaction: ButtonInteraction,
  messageId: string,
  wipeId: number,
): Promise<void> {
  try {
    const wipe = getWipeById(wipeId);
    if (!wipe || !interaction.channel) return;

    const message = await (interaction.channel as TextChannel).messages.fetch(messageId);
    const embed = buildWipeEmbed(wipe);

    // Rebuild button row (keep the same component structure)
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`attendance:yes:${wipeId}`)
        .setLabel('Yes')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`attendance:no:${wipeId}`)
        .setLabel('No')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`attendance:late:${wipeId}`)
        .setLabel('Late')
        .setEmoji('⏰')
        .setStyle(ButtonStyle.Primary),
    );

    await message.edit({ embeds: [embed], components: [row] });
  } catch (err) {
    logger.warn('Could not refresh wipe embed:', err);
  }
}
