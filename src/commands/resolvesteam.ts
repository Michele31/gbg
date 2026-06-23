import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getAllPlayers, setSteamId64 } from '../services/playerService';
import { resolveSteamId64 } from '../services/steamResolver';
import { hasWipePermission } from '../utils/permissions';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('resolvesteam')
  .setDescription('Resolve SteamID64 for all registered members (fixes vanity URLs)');

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

  const players = getAllPlayers();
  let resolved = 0;
  let alreadyOk = 0;
  const failed: string[] = [];

  for (const player of players) {
    // Skip if a valid SteamID64 is already stored
    if (player.steamid64 && /^\d{17}$/.test(player.steamid64)) {
      alreadyOk++;
      continue;
    }

    const id = await resolveSteamId64(player.steam);
    if (id) {
      setSteamId64(player.user_id, id);
      resolved++;
    } else {
      failed.push(player.username);
    }

    // Be gentle on Steam's endpoint
    await new Promise((r) => setTimeout(r, 350));
  }

  logger.info(`resolvesteam by ${interaction.user.username}: ${resolved} resolved, ${alreadyOk} already ok, ${failed.length} failed`);

  let msg =
    `🔗 **Steam resolve complete**\n` +
    `✅ Resolved: **${resolved}**\n` +
    `👍 Already had SteamID64: **${alreadyOk}**\n` +
    `❌ Failed: **${failed.length}**`;
  if (failed.length) msg += `\n\nCould not resolve: ${failed.join(', ')}`;

  await interaction.editReply(msg);
}
