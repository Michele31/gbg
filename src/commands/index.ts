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
import * as register from './register';
import * as profile from './profile';
import * as code from './code';
import * as roster from './roster';
import * as unregister from './unregister';
import * as adminregister from './adminregister';
import * as syncnames from './syncnames';

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

const commandList: Command[] = [wipe, attendance, exportCmd, closewipe, remind, register, profile, code, roster, unregister, adminregister, syncnames];

export const commands = new Collection<string, Command>(
  commandList.map((cmd) => [cmd.data.name, cmd]),
);
