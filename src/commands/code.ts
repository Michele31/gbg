import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('code')
  .setDescription('Generate a random 4-digit code');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const code = String(Math.floor(1000 + Math.random() * 9000));
  await interaction.reply({ content: `🔢 Your code: ||${code}||` });
}
