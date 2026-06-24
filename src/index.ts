import { Client, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import { config } from './config';
import { commands } from './commands';
import { initDatabase } from './database';
import { registerEvents } from './events';
import { startApi } from './api';
import { logger } from './utils/logger';

async function deployCommands(): Promise<void> {
  const rest = new REST().setToken(config.token);
  const body = [...commands.values()].map((cmd) => cmd.data.toJSON());

  if (config.guildId) {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
    logger.info(`Registered ${body.length} command(s) to guild ${config.guildId}`);
  } else {
    await rest.put(Routes.applicationCommands(config.clientId), { body });
    logger.info(`Registered ${body.length} command(s) globally`);
  }
}

async function main(): Promise<void> {
  logger.info(`DATABASE_PATH = ${config.databasePath}`);
  initDatabase();
  startApi();

  await deployCommands();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  registerEvents(client);

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection:', reason);
  });

  process.on('SIGINT', () => {
    logger.info('Shutting down...');
    client.destroy();
    process.exit(0);
  });

  await client.login(config.token);
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
