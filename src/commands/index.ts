import { Collection, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import * as wipe from './wipe';
import * as attendance from './attendance';
import * as exportCmd from './export';
import * as closewipe from './closewipe';

export interface Command {
  data: SlashCommandBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

const commandList: Command[] = [wipe, attendance, exportCmd, closewipe];

export const commands = new Collection<string, Command>(
  commandList.map((cmd) => [cmd.data.name, cmd]),
);
