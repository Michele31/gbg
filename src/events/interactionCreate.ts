import {
  Client,
  Events,
  Interaction,
  ButtonInteraction,
  TextChannel,
} from 'discord.js';
import { commands } from '../commands';
import { handleVipButton, askVip } from '../services/vipService';
import {
  upsertAttendance,
  removeAttendance,
  getAttendance,
  getWipeById,
  getAllAttendance,
  closeWipe,
} from '../services/wipeService';
import { buildWipeEmbed, buildAttendanceEmbed } from '../utils/embeds';
import { buildAttendanceRow } from '../commands/wipe';
import { hasWipePermission } from '../utils/permissions';
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
  const parts = interaction.customId.split(':');
  const category = parts[0];

  // ── VIP buttons ───────────────────────────────────────────────────────────
  if (category === 'vip') {
    await handleVipButton(interaction);
    return;
  }

  // ── Attendance list button ────────────────────────────────────────────────
  if (category === 'list') {
    const wipeId = parseInt(parts[1], 10);
    const wipe = getWipeById(wipeId);
    if (!wipe) {
      await interaction.reply({ content: '❌ Wipe not found.', ephemeral: true });
      return;
    }
    const rows = getAllAttendance(wipeId);
    const embed = buildAttendanceEmbed(wipe, rows);
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  // ── Close wipe button (⚙️) ────────────────────────────────────────────────
  if (category === 'closewipe') {
    const wipeId = parseInt(parts[1], 10);
    const wipe = getWipeById(wipeId);

    if (!wipe) {
      await interaction.reply({ content: '❌ Wipe not found.', ephemeral: true });
      return;
    }

    if (!interaction.inCachedGuild() || !hasWipePermission(interaction.member)) {
      await interaction.reply({ content: '❌ You do not have permission to close wipes.', ephemeral: true });
      return;
    }

    if (wipe.closed) {
      await interaction.reply({ content: '🔒 This wipe is already closed.', ephemeral: true });
      return;
    }

    closeWipe(wipeId);
    logger.info(`Wipe #${wipeId} closed by ${interaction.user.username}`);

    const updatedWipe = getWipeById(wipeId)!;
    const embed = buildWipeEmbed(updatedWipe);
    const disabledRow = buildAttendanceRow(wipeId, true);
    await interaction.update({ embeds: [embed], components: [disabledRow] });
    return;
  }

  // ── Attendance buttons (Accept / Decline / Late) ──────────────────────────
  if (category === 'attendance') {
    const action = parts[1];
    const wipeId = parseInt(parts[2], 10);
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
      removeAttendance(wipeId, interaction.user.id);
      await interaction.reply({ content: '↩️ Removed your attendance.', ephemeral: true });
    } else {
      upsertAttendance({
        wipe_id: wipeId,
        user_id: interaction.user.id,
        username: interaction.user.username,
        status,
      });

      const label = status === 'yes' ? '✅ Accepted' : status === 'no' ? '❌ Declined' : '🕐 Late';
      await interaction.reply({ content: `${label} — recorded!`, ephemeral: true });

      if (status === 'yes' || status === 'late') {
        const channel = interaction.channel as TextChannel | null;
        if (channel) await askVip(interaction.user, wipeId, channel);
      }
    }

    await refreshWipeEmbed(interaction, wipe.message_id, wipeId);
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
    const row = buildAttendanceRow(wipeId);

    await message.edit({ embeds: [embed], components: [row] });
  } catch (err) {
    logger.warn('Could not refresh wipe embed:', err);
  }
}
