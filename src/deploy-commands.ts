import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './commands';
import { config } from './config';
import { logger } from './utils/logger';

const rest = new REST().setToken(config.token);

const body = [...commands.values()].map((cmd) => cmd.data.toJSON());

(async () => {
  try {
    logger.info(`Deploying ${body.length} command(s)…`);

    if (config.guildId) {
      // Guild-scoped — instant update, good for development
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
      logger.info(`Commands deployed to guild ${config.guildId}`);
    } else {
      // Global — can take up to 1 hour to propagate
      await rest.put(Routes.applicationCommands(config.clientId), { body });
      logger.info('Commands deployed globally');
    }
  } catch (err) {
    logger.error('Failed to deploy commands:', err);
    process.exit(1);
  }
})();
