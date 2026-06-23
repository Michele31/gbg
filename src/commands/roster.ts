import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { buildRosterEmbeds } from '../services/rosterService';
import { setSetting, getSetting } from '../services/settingsService';
import { hasWipePermission } from '../utils/permissions';

export const data = new SlashCommandBuilder()
  .setName('roster')
  .setDescription('Post (or refresh) the live clan roster embed');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  const embeds = buildRosterEmbeds();
  const stored = getSetting('roster_message');

  // Try to edit existing roster message first
  if (stored) {
    try {
      const [channelId, messageId] = stored.split(':');
      const channel = interaction.guild.channels.cache.get(channelId) as TextChannel | undefined;
      if (channel) {
        const msg = await channel.messages.fetch(messageId);
        await msg.edit({ embeds });
        await interaction.reply({ content: `✅ Roster refreshed in <#${channelId}>.`, ephemeral: true });
        return;
      }
    } catch {
      // Message no longer exists — post a new one
    }
  }

  // Post a new roster message in the current channel
  const channel = interaction.channel as TextChannel;
  const message = await channel.send({ embeds });
  setSetting('roster_message', `${channel.id}:${message.id}`);

  await interaction.reply({ content: '✅ Roster posted! It will auto-update when members register.', ephemeral: true });
}
