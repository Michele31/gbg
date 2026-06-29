import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  Guild,
  EmbedBuilder,
  ColorResolvable,
} from 'discord.js';
import { getPlayer } from '../services/playerService';
import { config } from '../config';

export const data = new SlashCommandBuilder()
  .setName('turrets')
  .setDescription('List everyone who should be added to turrets, with their Steam links');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const guild = interaction.guild as Guild;
  await guild.members.fetch();

  const role = guild.roles.cache.get(config.turretsRoleId);
  if (!role) {
    await interaction.editReply('❌ Turrets role not found in this server.');
    return;
  }

  const members = role.members; // Collection<GuildMember>

  if (members.size === 0) {
    await interaction.editReply('ℹ️ No members currently have the turrets role.');
    return;
  }

  const lines = members.map((m) => {
    const player = getPlayer(m.id);
    const name = m.displayName.toUpperCase();
    if (player) {
      return `🔫 **${name}** — [Steam](${player.steam})`;
    }
    return `🔫 **${name}** — ⚠️ *not registered* (use \`/register\`)`;
  });

  const embed = new EmbedBuilder()
    .setColor(`#${config.embedColor}` as ColorResolvable)
    .setTitle('🔫 Turrets — People to Add')
    .setDescription(
      `**Add the following players to be authorized to turrets**\n\n` +
      lines.join('\n'),
    )
    .setFooter({ text: `${members.size} member${members.size !== 1 ? 's' : ''} with turrets role` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
