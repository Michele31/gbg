import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { getLatestOpenWipe, closeWipe, getWipeById } from '../services/wipeService';
import { hasWipePermission } from '../utils/permissions';
import { buildWipeEmbed } from '../utils/embeds';
import { buildAttendanceRow } from './wipe';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('closewipe')
  .setDescription('Lock the current wipe so attendance is no longer tracked');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  if (!hasWipePermission(interaction.member)) {
    await interaction.reply({ content: '❌ You do not have permission to close wipes.', ephemeral: true });
    return;
  }

  const wipe = getLatestOpenWipe(interaction.guildId);
  if (!wipe) {
    await interaction.reply({ content: '❌ No active wipe found.', ephemeral: true });
    return;
  }

  closeWipe(wipe.id);
  logger.info(`Wipe #${wipe.id} closed by ${interaction.user.username}`);

  try {
    const channel = interaction.guild.channels.cache.get(wipe.channel_id) as TextChannel | undefined;
    if (channel) {
      const message = await channel.messages.fetch(wipe.message_id);
      const updatedWipe = getWipeById(wipe.id)!;
      await message.edit({
        embeds: [buildWipeEmbed(updatedWipe)],
        components: [buildAttendanceRow(wipe.id, true)],
      });
    }
  } catch (err) {
    logger.warn('Could not update wipe message on close:', err);
  }

  await interaction.reply({ content: '🔒 Wipe closed — attendance is no longer tracked.', ephemeral: false });
}
