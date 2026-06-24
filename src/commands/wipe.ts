import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ColorResolvable,
} from 'discord.js';
import { config } from '../config';
import { hasWipePermission } from '../utils/permissions';
import { buildWipeEmbed } from '../utils/embeds';
import { createWipe } from '../services/wipeService';
import { getDisplayName } from '../utils/display';
import { refreshMissingPanel } from '../services/missingService';
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
    o.setName('server').setDescription('Server name (overrides default)').setRequired(false),
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
  const serverName = interaction.options.getString('server') ?? config.serverName;
  const notes = interaction.options.getString('notes') ?? undefined;

  await interaction.reply({ content: '✅ Wipe announcement created!', ephemeral: true });

  // Send a placeholder message first to get the real message ID
  const channel = interaction.channel as TextChannel;
  const pingContent = config.teamRoleId ? `<@&${config.teamRoleId}>` : undefined;

  const placeholder = await channel.send({ content: pingContent ?? '⏳ Setting up wipe...' });

  // Now save to DB with the real message ID
  const wipe = createWipe({
    guild_id: interaction.guildId,
    channel_id: interaction.channelId,
    message_id: placeholder.id,
    wipe_date: wipeDate,
    wipe_time: wipeTime,
    server_name: serverName,
    notes,
    created_by: interaction.user.id,
    created_by_tag: getDisplayName(interaction.member, interaction.user),
  });

  // Edit the placeholder with the real embed + buttons
  const embed = buildWipeEmbed(wipe);
  const row = buildAttendanceRow(wipe.id);
  await placeholder.edit({ content: pingContent ?? null, embeds: [embed], components: [row] });

  // Reset the "not responded" panel for the new wipe
  await refreshMissingPanel(interaction.client);

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
  );
}
