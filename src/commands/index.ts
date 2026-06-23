import {
  Collection,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js';
import * as wipe from './wipe';
import * as attendance from './attendance';
import * as exportCmd from './export';
import * as closewipe from './closewipe';
import * as remind from './remind';

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

const commandList: Command[] = [wipe, attendance, exportCmd, closewipe, remind];

export const commands = new Collection<string, Command>(
  commandList.map((cmd) => [cmd.data.name, cmd]),
);
