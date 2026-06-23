import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getLatestOpenWipe, getAllAttendance } from '../services/wipeService';
import { buildAttendanceEmbed } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('attendance')
  .setDescription('Show current wipe attendance');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  const wipe = getLatestOpenWipe(interaction.guildId);
  if (!wipe) {
    await interaction.reply({ content: '❌ No active wipe found.', ephemeral: true });
    return;
  }

  const rows = getAllAttendance(wipe.id);
  const embed = buildAttendanceEmbed(wipe, rows);

  await interaction.reply({ embeds: [embed], ephemeral: false });
}
