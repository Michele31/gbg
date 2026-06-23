import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, ColorResolvable } from 'discord.js';
import { getAllPlayers } from '../services/playerService';
import { config } from '../config';

export const data = new SlashCommandBuilder()
  .setName('roster')
  .setDescription('Show all registered clan members');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const players = getAllPlayers();

  if (players.length === 0) {
    await interaction.reply({ content: '❌ No members registered yet. Use `/register` to add yourself.', ephemeral: true });
    return;
  }

  const lines = players.map((p) =>
    `**${p.username.toUpperCase()}**\n[Steam](${p.steam}) • [BattleMetrics](${p.bm})`,
  );

  // Split into chunks of 10 to avoid hitting embed limits
  const chunkSize = 10;
  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += chunkSize) {
    chunks.push(lines.slice(i, i + chunkSize));
  }

  const embeds = chunks.map((chunk, i) =>
    new EmbedBuilder()
      .setColor(`#${config.embedColor}` as ColorResolvable)
      .setTitle(i === 0 ? `👥 Clan Roster — ${players.length} members` : '​')
      .setDescription(chunk.join('\n\n'))
      .setTimestamp(i === chunks.length - 1 ? new Date() : undefined),
  );

  await interaction.reply({ embeds, ephemeral: false });
}
