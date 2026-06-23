import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, ColorResolvable } from 'discord.js';
import { getPlayer } from '../services/playerService';
import { config } from '../config';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('View a player\'s registered Steam and BattleMetrics profile')
  .addUserOption((o) =>
    o
      .setName('user')
      .setDescription('Member to look up (defaults to yourself)')
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser('user') ?? interaction.user;
  const player = getPlayer(target.id);

  if (!player) {
    const isSelf = target.id === interaction.user.id;
    await interaction.reply({
      content: isSelf
        ? '❌ You are not registered yet. Use `/register` to add your Steam and BattleMetrics profile.'
        : `❌ <@${target.id}> has not registered yet.`,
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(`#${config.embedColor}` as ColorResolvable)
    .setTitle(`🎮 ${player.username}'s Profile`)
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      { name: 'Discord', value: `<@${player.user_id}>`, inline: true },
      { name: 'Steam', value: `[Profile](${player.steam})`, inline: true },
      { name: 'BattleMetrics', value: `[Profile](${player.bm})`, inline: true },
    )
    .setFooter({ text: `Registered: ${player.registered_at.slice(0, 10)}  •  Updated: ${player.updated_at.slice(0, 10)}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
