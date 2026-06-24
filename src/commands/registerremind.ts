import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  Guild,
  GuildMember,
  EmbedBuilder,
  ColorResolvable,
} from 'discord.js';
import { getAllPlayers } from '../services/playerService';
import { hasWipePermission } from '../utils/permissions';
import { config } from '../config';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('registerremind')
  .setDescription('DM all members who have not registered their Steam/BM yet');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  if (!hasWipePermission(interaction.member)) {
    await interaction.reply({ content: '❌ You do not have permission to send reminders.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild as Guild;
  await guild.members.fetch();

  const registered = new Set(getAllPlayers().map((p) => p.user_id));

  // Target: non-bot members who are NOT registered.
  // If TEAM_ROLE_ID is set, only remind members of that role.
  const targets: GuildMember[] = guild.members.cache
    .filter((m) => {
      if (m.user.bot) return false;
      if (registered.has(m.id)) return false;
      if (config.teamRoleId) return m.roles.cache.has(config.teamRoleId);
      return true;
    })
    .map((m) => m);

  if (targets.length === 0) {
    await interaction.editReply('✅ Everyone is already registered!');
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(`#${config.embedColor}` as ColorResolvable)
    .setTitle('📝 Please Register with GBG')
    .setDescription(
      "You haven't registered your **Steam** and **BattleMetrics** profiles yet.\n" +
      'Registering lets the team add you and track attendance.\n\n' +
      '**How to register:**\n' +
      'Go to the server and run:\n' +
      '```/register steam:<your steam> bm:<your battlemetrics>```\n\n' +
      '**Examples of what you can paste for `steam`:**\n' +
      '• Full profile URL — `https://steamcommunity.com/id/yourname`\n' +
      '• Or your SteamID64 — `7656119XXXXXXXXXX`\n\n' +
      '**For `bm`:**\n' +
      '• Your BattleMetrics URL — `https://www.battlemetrics.com/players/123456`\n' +
      '• Or just the player ID — `123456`',
    )
    .setFooter({ text: 'GBG Registration' })
    .setTimestamp();

  let sent = 0;
  let failed = 0;

  for (const member of targets) {
    try {
      await member.send({ embeds: [embed] });
      sent++;
    } catch {
      failed++;
      logger.warn(`Could not DM ${member.user.username} (${member.id}) — DMs likely closed`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  logger.info(`registerremind by ${interaction.user.username}: ${sent} delivered, ${failed} failed`);

  await interaction.editReply(
    `📨 Registration reminder sent!\n✅ Delivered: **${sent}**\n❌ Failed (DMs closed): **${failed}**`,
  );
}
