import http from 'http';
import { getAllPlayers } from './services/playerService';
import { logger } from './utils/logger';

/** Extracts a SteamID64 from a /profiles/ URL, else returns null */
function extractSteamId64(steam: string): string | null {
  const m = steam.match(/profiles\/(\d{17})/);
  if (m) return m[1];
  if (/^\d{17}$/.test(steam)) return steam;
  return null;
}

const API_KEY = process.env.API_KEY ?? '';
// Railway assigns the public-facing port via PORT — prefer it, fall back to API_PORT
const PORT    = parseInt(process.env.PORT ?? process.env.API_PORT ?? '3000', 10);

export function startApi(): void {
  const server = http.createServer((req, res) => {
    // CORS — allow the Chrome extension origin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'x-api-key');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Simple API key auth
    if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    if (req.url === '/roster' && req.method === 'GET') {
      const players = getAllPlayers().map((p) => ({
        discordId:  p.user_id,
        username:   p.username,
        steam:      p.steam,
        steamid64:  p.steamid64 ?? extractSteamId64(p.steam),
        bm:         p.bm,
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(players));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(PORT, () => logger.info(`API server listening on port ${PORT}`));
}
