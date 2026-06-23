import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
    o.setName('date').setDescription('Wipe date (e.g. 2026-07-03)').setRequired(true),
  )
  .addStringOption((o) =>
    o.setName('time').setDescription('Wipe time (e.g. 19:00)').setRequired(true),
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

  const wipe = createWipe({
    guild_id: interaction.guildId,
    channel_id: interaction.channelId,
    message_id: 'pending',
    wipe_date: wipeDate,
    wipe_time: wipeTime,
    server_name: config.serverName,
    notes,
    created_by: interaction.user.id,
    created_by_tag: interaction.user.username,
  });

  const embed = buildWipeEmbed(wipe);
  const row = buildAttendanceRow(wipe.id);

  await interaction.reply({ content: '✅ Wipe announcement created!', ephemeral: true });

  const channel = interaction.channel as TextChannel;
  const pingContent = config.teamRoleId ? `<@&${config.teamRoleId}>` : undefined;
  const message = await channel.send({ content: pingContent, embeds: [embed], components: [row] });

  updateWipeMessageId(wipe.id, message.id);

  logger.info(`Wipe #${wipe.id} created by ${interaction.user.username} in guild ${interaction.guildId}`);
}

export function buildAttendanceRow(wipeId: number, disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`attendance:yes:${wipeId}`)
      .setLabel('Accept')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`attendance:no:${wipeId}`)
      .setLabel('Decline')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`attendance:late:${wipeId}`)
      .setLabel('Late')
      .setEmoji('🕐')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`list:${wipeId}`)
      .setEmoji('📋')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`closewipe:${wipeId}`)
      .setEmoji('⚙️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
  );
}
