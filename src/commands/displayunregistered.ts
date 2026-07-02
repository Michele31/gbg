import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  Guild,
  GuildMember,
  EmbedBuilder,
  ColorResolvable,
} from 'discord.js';
import { getAllPlayers } from '../services/playerService';
import { config } from '../config';

export const data = new SlashCommandBuilder()
  .setName('displayunregistered')
  .setDescription('Show all members who have not registered yet');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const guild = interaction.guild as Guild;
  await guild.members.fetch();

  const registered = new Set(getAllPlayers().map((p) => p.user_id));

  // Non-bot members not in the players table.
  // If TEAM_ROLE_ID is set, only consider members of that role.
  const missing: GuildMember[] = guild.members.cache
    .filter((m) => {
      if (m.user.bot) return false;
      if (registered.has(m.id)) return false;
      if (config.teamRoleId) return m.roles.cache.has(config.teamRoleId);
      return true;
    })
    .map((m) => m);

  if (missing.length === 0) {
    await interaction.editReply('✅ Everyone is registered!');
    return;
  }

  const lines = missing.map((m) => `• <@${m.id}> — **${m.displayName}**`);

  const embed = new EmbedBuilder()
    .setColor(`#${config.embedColor}` as ColorResolvable)
    .setTitle('📋 Unregistered Members')
    .setDescription(
      `These members haven't registered yet (**${missing.length}**):\n\n` + lines.join('\n'),
    )
    .setFooter({ text: 'They should run /register with their Steam and BattleMetrics' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
