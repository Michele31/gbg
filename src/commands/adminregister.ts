import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, ColorResolvable } from 'discord.js';
import { upsertPlayer, getPlayer } from '../services/playerService';
import { refreshRoster, sendJoinNotification } from '../services/rosterService';
import { hasWipePermission } from '../utils/permissions';
import { getDisplayName } from '../utils/display';
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
  .setName('adminregister')
  .setDescription('Register a member on their behalf')
  .addUserOption((o) =>
    o.setName('user').setDescription('Member to register').setRequired(true),
  )
  .addStringOption((o) =>
    o.setName('steam').setDescription('Steam profile URL, SteamID64, or vanity name').setRequired(true),
  )
  .addStringOption((o) =>
    o.setName('bm').setDescription('BattleMetrics profile URL or player ID').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  if (!hasWipePermission(interaction.member)) {
    await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
    return;
  }

  const target = interaction.options.getUser('user', true);
  const targetMember = interaction.options.getMember('user');
  const steam = normaliseSteam(interaction.options.getString('steam', true));
  const bm = normaliseBm(interaction.options.getString('bm', true));
  const isUpdate = !!getPlayer(target.id);
  const displayName = getDisplayName(targetMember, target);

  upsertPlayer({
    user_id: target.id,
    username: displayName,
    steam,
    bm,
  });

  const embed = new EmbedBuilder()
    .setColor(`#${config.embedColor}` as ColorResolvable)
    .setTitle(isUpdate ? `✏️ ${displayName}'s Profile Updated` : `✅ ${displayName} Registered!`)
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      { name: 'Discord', value: `<@${target.id}>`, inline: true },
      { name: 'Steam', value: `[Profile](${steam})`, inline: true },
      { name: 'BattleMetrics', value: `[Profile](${bm})`, inline: true },
    )
    .setFooter({ text: `Registered by ${interaction.user.username}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });

  await refreshRoster(interaction.client);

  if (!isUpdate) {
    await sendJoinNotification(interaction.client, target, displayName, steam);
  }
}
