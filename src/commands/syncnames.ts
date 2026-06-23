import { ChatInputCommandInteraction, SlashCommandBuilder, Guild } from 'discord.js';
import { getAllPlayers, updatePlayerUsername } from '../services/playerService';
import { refreshRoster } from '../services/rosterService';
import { getDisplayName } from '../utils/display';
import { hasWipePermission } from '../utils/permissions';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('syncnames')
  .setDescription('Update all registered members to their current Discord display name');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  if (!hasWipePermission(interaction.member)) {
    await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild as Guild;
  await guild.members.fetch();

  const players = getAllPlayers();
  let updated = 0;
  let unchanged = 0;
  let missing = 0;

  for (const player of players) {
    const member = guild.members.cache.get(player.user_id);
    if (!member) {
      missing++;
      continue;
    }

    const displayName = getDisplayName(member, member.user);
    if (displayName !== player.username) {
      updatePlayerUsername(player.user_id, displayName);
      updated++;
    } else {
      unchanged++;
    }
  }

  await refreshRoster(interaction.client);
  logger.info(`syncnames by ${interaction.user.username}: ${updated} updated, ${unchanged} unchanged, ${missing} missing`);

  await interaction.editReply(
    `🔄 **Name sync complete**\n` +
    `✏️ Updated: **${updated}**\n` +
    `✅ Already correct: **${unchanged}**\n` +
    `⚠️ Left the server: **${missing}**`,
  );
}
