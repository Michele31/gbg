import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getLatestOpenWipe, closeWipe, getWipeById } from '../services/wipeService';
import { hasWipePermission } from '../utils/permissions';
import { buildWipeEmbed } from '../utils/embeds';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('closewipe')
  .setDescription('Lock the current wipe so reactions no longer count');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  if (!hasWipePermission(interaction.member)) {
    await interaction.reply({ content: '❌ You do not have permission to close wipes.', ephemeral: true });
    return;
  }

  const wipe = getLatestOpenWipe(interaction.guildId);
  if (!wipe) {
    await interaction.reply({ content: '❌ No active wipe found.', ephemeral: true });
    return;
  }

  closeWipe(wipe.id);
  logger.info(`Wipe #${wipe.id} closed by ${interaction.user.tag}`);

  // Update the original message embed to reflect closed state and disable buttons
  try {
    const channel = interaction.guild.channels.cache.get(wipe.channel_id) as TextChannel | undefined;
    if (channel) {
      const message = await channel.messages.fetch(wipe.message_id);
      const updatedWipe = getWipeById(wipe.id)!;
      const embed = buildWipeEmbed(updatedWipe);

      // Disable all buttons
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`attendance:yes:${wipe.id}`)
          .setLabel('Yes')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`attendance:no:${wipe.id}`)
          .setLabel('No')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`attendance:late:${wipe.id}`)
          .setLabel('Late')
          .setEmoji('⏰')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
      );

      await message.edit({ embeds: [embed], components: [disabledRow] });
    }
  } catch (err) {
    logger.warn('Could not update wipe message on close:', err);
  }

  await interaction.reply({ content: '🔒 Wipe has been closed. Reactions are no longer tracked.', ephemeral: false });
}
