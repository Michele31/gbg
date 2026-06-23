import { EmbedBuilder, ColorResolvable } from 'discord.js';
import { WipeRow, AttendanceRow } from '../database/types';
import { config } from '../config';
import { getAttendanceCounts } from '../services/wipeService';

const EMOJI = { yes: '✅', no: '❌', late: '⏰' } as const;

export function buildWipeEmbed(wipe: WipeRow): EmbedBuilder {
  const counts = getAttendanceCounts(wipe.id);
  const color = `#${config.embedColor}` as ColorResolvable;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('🛢️  Wipe Announcement')
    .addFields(
      { name: 'Server', value: wipe.server_name, inline: true },
      { name: 'Date', value: wipe.wipe_date, inline: true },
      { name: 'Time', value: wipe.wipe_time, inline: true },
    )
    .setFooter({
      text: `${EMOJI.yes} ${counts.yes}  ${EMOJI.late} ${counts.late}  ${EMOJI.no} ${counts.no}${wipe.closed ? '  •  🔒 Closed' : ''}`,
    })
    .setTimestamp();

  if (wipe.notes) embed.addFields({ name: 'Notes', value: wipe.notes });

  if (config.teamRoleId) {
    embed.setDescription(`<@&${config.teamRoleId}> React below to mark your attendance!`);
  } else {
    embed.setDescription('React below to mark your attendance!\n\n✅ Yes\n❌ No\n⏰ Late');
  }

  return embed;
}

export function buildAttendanceEmbed(wipe: WipeRow, rows: AttendanceRow[]): EmbedBuilder {
  const color = `#${config.embedColor}` as ColorResolvable;

  const group = (status: 'yes' | 'no' | 'late') =>
    rows
      .filter((r) => r.status === status)
      .map((r) => `• <@${r.user_id}>${r.vip === 1 ? ' **(VIP)**' : ''}`)
      .join('\n') || '*None*';

  const counts = getAttendanceCounts(wipe.id);

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`📋 Attendance — ${wipe.wipe_date} ${wipe.wipe_time}`)
    .addFields(
      { name: `${EMOJI.yes} Yes (${counts.yes})`, value: group('yes') },
      { name: `${EMOJI.late} Late (${counts.late})`, value: group('late') },
      { name: `${EMOJI.no} No (${counts.no})`, value: group('no') },
    )
    .setFooter({ text: `Total: ${rows.length}` })
    .setTimestamp();
}
