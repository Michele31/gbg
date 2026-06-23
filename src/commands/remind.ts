import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  Guild,
  GuildMember,
} from 'discord.js';
import { getLatestOpenWipe, getAllAttendance } from '../services/wipeService';
import { hasWipePermission } from '../utils/permissions';
import { config } from '../config';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('remind')
  .setDescription('DM all server members who have not responded to the current wipe');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  if (!hasWipePermission(interaction.member)) {
    await interaction.reply({ content: '❌ You do not have permission to send reminders.', ephemeral: true });
    return;
  }

  const wipe = getLatestOpenWipe(interaction.guildId);
  if (!wipe) {
    await interaction.reply({ content: '❌ No active wipe found.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  // Fetch all guild members
  const guild = interaction.guild as Guild;
  await guild.members.fetch();

  const responded = new Set(getAllAttendance(wipe.id).map((r) => r.user_id));

  // Build the target list: non-bot members who haven't responded
  // If TEAM_ROLE_ID is set, only remind members of that role; otherwise remind everyone
  const targets: GuildMember[] = guild.members.cache
    .filter((m) => {
      if (m.user.bot) return false;
      if (responded.has(m.id)) return false;
      if (config.teamRoleId) return m.roles.cache.has(config.teamRoleId);
      return true;
    })
    .map((m) => m);

  if (targets.length === 0) {
    await interaction.editReply('✅ Everyone has already responded!');
    return;
  }

  const message =
    `📢 **Wipe Reminder** — **${wipe.server_name}**\n` +
    `📅 ${wipe.wipe_date} at ${wipe.wipe_time} (${config.timezone})\n\n` +
    `You haven't marked your attendance yet. Head to the server and click **Accept**, **Decline**, or **Late**!`;

  let sent = 0;
  let failed = 0;

  for (const member of targets) {
    try {
      await member.send(message);
      sent++;
    } catch {
      // DMs closed — skip silently
      failed++;
      logger.warn(`Could not DM ${member.user.username} (${member.id}) — DMs likely closed`);
    }
    // Small delay to avoid hitting rate limits
    await new Promise((res) => setTimeout(res, 500));
  }

  logger.info(`Remind sent for wipe #${wipe.id}: ${sent} delivered, ${failed} failed`);

  await interaction.editReply(
    `📨 Reminder sent!\n✅ Delivered: **${sent}**\n❌ Failed (DMs closed): **${failed}**`,
  );
}
