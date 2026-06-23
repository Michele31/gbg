import { Client } from 'discord.js';
import * as ready from './ready';
import * as interactionCreate from './interactionCreate';

interface EventModule {
  name: string;
  once?: boolean;
  execute(...args: unknown[]): Promise<void>;
}

const events: EventModule[] = [ready, interactionCreate];

export function registerEvents(client: Client): void {
  for (const event of events) {
    if (event.once) {
      client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
      client.on(event.name, (...args) => event.execute(client, ...args));
    }
  }
}
