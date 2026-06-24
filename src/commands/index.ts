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
import * as wipecode from './wipecode';
import * as roster from './roster';
import * as unregister from './unregister';
import * as adminregister from './adminregister';
import * as syncnames from './syncnames';
import * as resolvesteam from './resolvesteam';
import * as registerremind from './registerremind';

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

const commandList: Command[] = [wipe, attendance, exportCmd, closewipe, remind, register, profile, wipecode, roster, unregister, adminregister, syncnames, resolvesteam, registerremind];

export const commands = new Collection<string, Command>(
  commandList.map((cmd) => [cmd.data.name, cmd]),
);
