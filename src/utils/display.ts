import { GuildMember, User, APIInteractionGuildMember } from 'discord.js';

/**
 * Resolves the best "display name" for a member:
 * server nickname → global display name → account username.
 */
export function getDisplayName(
  member: GuildMember | APIInteractionGuildMember | null,
  user: User,
): string {
  if (member) {
    if ('displayName' in member && member.displayName) return member.displayName;
    if ('nick' in member && member.nick) return member.nick;
  }
  return user.globalName ?? user.username;
}
