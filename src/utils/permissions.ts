import { GuildMember } from 'discord.js';
import { config } from '../config';

export function hasWipePermission(member: GuildMember): boolean {
  if (config.allowedRoles.length === 0) return true; // no restrictions configured
  return member.roles.cache.some((role) => config.allowedRoles.includes(role.id));
}
