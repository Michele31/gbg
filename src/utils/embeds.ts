import { EmbedBuilder, ColorResolvable } from 'discord.js';
import { WipeRow, AttendanceRow } from '../database/types';
import { config } from '../config';
import { getAllAttendance, getAttendanceCounts } from '../services/wipeService';

function relativeDate(dateStr: string, timeStr: string): string {
  const combined = new Date(`${dateStr}T${timeStr.replace(/[^0-9:]/g, '').slice(0, 5)}:00`);
  if (isNaN(combined.getTime())) return '';
  const diffDays = Math.round((combined.getTime() - Date.now()) / 86_400_000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'in 1 day';
  if (diffDays > 1) return `in ${diffDays} days`;
  if (diffDays === -1) return '1 day ago';
  return `${Math.abs(diffDays)} days ago`;
}

function formatNames(rows: AttendanceRow[], status: 'yes' | 'no' | 'late'): string {
  const filtered = rows.filter((r) => r.status === status);
  if (filtered.length === 0) return 'None';
  return filtered.map((r) => `<@${r.user_id}>`).join('\n');
}

export function buildWipeEmbed(wipe: WipeRow): EmbedBuilder {
  const counts = getAttendanceCounts(wipe.id);
  const rows = getAllAttendance(wipe.id);
  const color = `#${config.embedColor}` as ColorResolvable;
  const rel = relativeDate(wipe.wipe_date, wipe.wipe_time);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`📝  ${wipe.server_name}`)
    .addFields(
      {
        name: 'Date & Time',
        value: [`${wipe.wipe_date} ${wipe.wipe_time}`, rel, `(Timezone: ${config.timezone})`]
          .filter(Boolean)
          .join('\n'),
        inline: false,
      },
      {
        name: `✅ Yes (${counts.yes})`,
        value: formatNames(rows, 'yes'),
        inline: true,
      },
      {
        name: `💎 VIP (${counts.vip})`,
        value:
          rows.filter((r) => r.vip === 1).map((r) => `<@${r.user_id}>`).join('\n') || 'None',
        inline: true,
      },
      {
        name: `🕐 Late (${counts.late})`,
        value: formatNames(rows, 'late'),
        inline: true,
      },
      {
        name: `❌ No (${counts.no})`,
        value: formatNames(rows, 'no'),
        inline: true,
      },
    )
    .setFooter({
      text: `Created by: ${wipe.created_by_tag ?? 'Unknown'}${wipe.closed ? '  •  🔒 Closed' : ''}`,
    })
    .setTimestamp();

  if (wipe.notes) embed.setDescription(`📌 ${wipe.notes}`);

  return embed;
}

export function buildAttendanceEmbed(wipe: WipeRow, rows: AttendanceRow[]): EmbedBuilder {
  const color = `#${config.embedColor}` as ColorResolvable;
  const counts = getAttendanceCounts(wipe.id);

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`📋 Attendance — ${wipe.server_name}`)
    .addFields(
      { name: `✅ Yes (${counts.yes})`, value: formatNames(rows, 'yes'), inline: true },
      {
        name: `💎 VIP (${counts.vip})`,
        value: rows.filter((r) => r.vip === 1).map((r) => `<@${r.user_id}>`).join('\n') || 'None',
        inline: true,
      },
      { name: `🕐 Late (${counts.late})`, value: formatNames(rows, 'late'), inline: true },
      { name: `❌ No (${counts.no})`, value: formatNames(rows, 'no'), inline: true },
    )
    .setFooter({ text: `Total: ${rows.length}  •  ${wipe.wipe_date} ${wipe.wipe_time}` })
    .setTimestamp();
}
