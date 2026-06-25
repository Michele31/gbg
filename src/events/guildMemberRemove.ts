import { Client, Events, GuildMember, PartialGuildMember } from 'discord.js';
import { getPlayer, deletePlayer } from '../services/playerService';
import { refreshRoster, sendLeaveNotification } from '../services/rosterService';
import { refreshMissingPanel } from '../services/missingService';
import { logger } from '../utils/logger';

export const name = Events.GuildMemberRemove;
export const once = false;

export async function execute(
  client: Client,
  member: GuildMember | PartialGuildMember,
): Promise<void> {
  const player = getPlayer(member.id);
  if (!player) return; // not registered — nothing to clean up

  const steam = player.steam;
  const displayName = player.username; // stored display name

  deletePlayer(member.id);
  logger.info(`${displayName} auto-unregistered after leaving the server`);

  await refreshRoster(client);
  await sendLeaveNotification(client, member.user, displayName, steam);
  await refreshMissingPanel(client);
}
