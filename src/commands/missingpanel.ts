import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { postMissingPanel } from '../services/missingService';
import { hasWipePermission } from '../utils/permissions';
import { config } from '../config';

export const data = new SlashCommandBuilder()
  .setName('missingpanel')
  .setDescription('Post the live "not responded yet" panel in the configured channel');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  if (!hasWipePermission(interaction.member)) {
    await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
    return;
  }

  const ok = await postMissingPanel(interaction.client, interaction.guildId);

  await interaction.reply({
    content: ok
      ? `✅ Panel posted in <#${config.missingPanelChannelId}>. It will auto-update as members react.`
      : `❌ Could not post — check the bot can see <#${config.missingPanelChannelId}>.`,
    ephemeral: true,
  });
}
