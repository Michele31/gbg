import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { config } from '../config';
import { hasWipePermission } from '../utils/permissions';
import { buildWipeEmbed } from '../utils/embeds';
import { createWipe, updateWipeMessageId } from '../services/wipeService';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('wipe')
  .setDescription('Create a new wipe attendance announcement')
  .addStringOption((o) =>
    o.setName('date').setDescription('Wipe date (e.g. Thursday 19 June)').setRequired(true),
  )
  .addStringOption((o) =>
    o.setName('time').setDescription('Wipe time (e.g. 18:00 UTC)').setRequired(true),
  )
  .addStringOption((o) =>
    o.setName('notes').setDescription('Optional notes').setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  if (!hasWipePermission(interaction.member)) {
    await interaction.reply({ content: '❌ You do not have permission to create wipe announcements.', ephemeral: true });
    return;
  }

  const wipeDate = interaction.options.getString('date', true);
  const wipeTime = interaction.options.getString('time', true);
  const notes = interaction.options.getString('notes') ?? undefined;

  // Create a placeholder wipe record; we'll update the message_id after posting
  const wipe = createWipe({
    guild_id: interaction.guildId,
    channel_id: interaction.channelId,
    message_id: 'pending',
    wipe_date: wipeDate,
    wipe_time: wipeTime,
    server_name: config.serverName,
    notes,
    created_by: interaction.user.id,
  });

  const embed = buildWipeEmbed(wipe);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`attendance:yes:${wipe.id}`)
      .setLabel('Yes')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`attendance:no:${wipe.id}`)
      .setLabel('No')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`attendance:late:${wipe.id}`)
      .setLabel('Late')
      .setEmoji('⏰')
      .setStyle(ButtonStyle.Primary),
  );

  await interaction.reply({ content: '✅ Wipe announcement created!', ephemeral: true });

  const channel = interaction.channel as TextChannel;
  const message = await channel.send({ embeds: [embed], components: [row] });

  // Store the real message ID
  updateWipeMessageId(wipe.id, message.id);

  logger.info(`Wipe #${wipe.id} created by ${interaction.user.tag} in guild ${interaction.guildId}`);
}
