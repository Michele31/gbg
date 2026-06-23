import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from './config';
import { initDatabase } from './database';
import { registerEvents } from './events';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  initDatabase();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
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
