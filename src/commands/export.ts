import { ChatInputCommandInteraction, SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { stringify } from 'csv-stringify/sync';
import { getLatestOpenWipe, getAllAttendance } from '../services/wipeService';
import { hasWipePermission } from '../utils/permissions';

export const data = new SlashCommandBuilder()
  .setName('export')
  .setDescription('Export wipe attendance as a CSV file');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  if (!hasWipePermission(interaction.member)) {
    await interaction.reply({ content: '❌ You do not have permission to export attendance.', ephemeral: true });
    return;
  }

  const wipe = getLatestOpenWipe(interaction.guildId);
  if (!wipe) {
    await interaction.reply({ content: '❌ No active wipe found.', ephemeral: true });
    return;
  }

  const rows = getAllAttendance(wipe.id);

  const csvData = stringify(
    rows.map((r) => ({
      Username: r.username,
      'Discord ID': r.user_id,
      Status: r.status,
      VIP: r.vip === null ? 'N/A' : r.vip === 1 ? 'Yes' : 'No',
      Timestamp: r.updated_at,
    })),
    { header: true },
  );

  const buffer = Buffer.from(csvData, 'utf-8');
  const attachment = new AttachmentBuilder(buffer, {
    name: `attendance_${wipe.wipe_date.replace(/\s+/g, '_')}.csv`,
  });

  await interaction.reply({ content: `📄 Attendance export for **${wipe.wipe_date}**:`, files: [attachment], ephemeral: true });
}
