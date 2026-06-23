import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, ColorResolvable } from 'discord.js';
import { upsertPlayer, getPlayer } from '../services/playerService';
import { refreshRoster, sendJoinNotification } from '../services/rosterService';
import { config } from '../config';

function normaliseSteam(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('http')) return trimmed;
  if (/^\d{17}$/.test(trimmed)) return `https://steamcommunity.com/profiles/${trimmed}`;
  return `https://steamcommunity.com/id/${trimmed}`;
}

function normaliseBm(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('http')) return trimmed;
  if (/^\d+$/.test(trimmed)) return `https://www.battlemetrics.com/players/${trimmed}`;
  return trimmed;
}

export const data = new SlashCommandBuilder()
  .setName('register')
  .setDescription('Register your Steam and BattleMetrics profile')
  .addStringOption((o) =>
    o.setName('steam').setDescription('Steam profile URL, SteamID64, or vanity name').setRequired(true),
  )
  .addStringOption((o) =>
    o.setName('bm').setDescription('BattleMetrics profile URL or player ID').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const steam = normaliseSteam(interaction.options.getString('steam', true));
  const bm = normaliseBm(interaction.options.getString('bm', true));
  const isUpdate = !!getPlayer(interaction.user.id);

  upsertPlayer({
    user_id: interaction.user.id,
    username: interaction.user.username,
    steam,
    bm,
  });

  const embed = new EmbedBuilder()
    .setColor(`#${config.embedColor}` as ColorResolvable)
    .setTitle(isUpdate ? '✏️ Profile Updated' : '✅ Registered!')
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: 'Discord', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Steam', value: `[Profile](${steam})`, inline: true },
      { name: 'BattleMetrics', value: `[Profile](${bm})`, inline: true },
    )
    .setFooter({ text: isUpdate ? 'Your profile has been updated.' : 'You are now registered.' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });

  // Refresh the live roster embed
  await refreshRoster(interaction.client);

  // Send join notification only on first registration, not updates
  if (!isUpdate) {
    await sendJoinNotification(interaction.client, interaction.user, steam);
  }
}
