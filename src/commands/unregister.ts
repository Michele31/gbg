import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getPlayer, deletePlayer } from '../services/playerService';
import { refreshRoster } from '../services/rosterService';
import { hasWipePermission } from '../utils/permissions';
import { config } from '../config';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('unregister')
  .setDescription('Remove a member from the roster')
  .addUserOption((o) =>
    o.setName('user').setDescription('Member to unregister').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  if (!hasWipePermission(interaction.member)) {
    await interaction.reply({ content: '❌ You do not have permission to unregister members.', ephemeral: true });
    return;
  }

  const target = interaction.options.getUser('user', true);
  const player = getPlayer(target.id);

  if (!player) {
    await interaction.reply({ content: `❌ <@${target.id}> is not registered.`, ephemeral: true });
    return;
  }

  deletePlayer(target.id);
  logger.info(`${target.username} unregistered by ${interaction.user.username}`);

  await interaction.reply({ content: `✅ <@${target.id}> has been removed from the roster.`, ephemeral: true });

  // Refresh the live roster embed
  await refreshRoster(interaction.client);

  // Send leave notification
  try {
    const channel = await interaction.client.channels.fetch(config.joinNotificationChannelId) as import('discord.js').TextChannel | null;
    if (channel) {
      await channel.send(`📢 **@${player.username.toUpperCase()} HAS LEFT GBG — BE SURE TO UNFRIEND/RENAME** <@${target.id}>`);
    }
  } catch (err) {
    logger.warn('Could not send leave notification:', err);
  }
}
