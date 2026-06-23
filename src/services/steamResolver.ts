import { logger } from '../utils/logger';

/**
 * Resolves any Steam profile input to a SteamID64.
 * Supports:
 *   - Full profiles URL:  https://steamcommunity.com/profiles/7656119...
 *   - Raw SteamID64:      7656119...
 *   - Vanity URL:         https://steamcommunity.com/id/<vanity>
 *   - Bare vanity name:   <vanity>
 *
 * Vanity names are resolved via Steam's public XML endpoint (no API key needed).
 * Returns null if it cannot be resolved.
 */
export async function resolveSteamId64(input: string): Promise<string | null> {
  const trimmed = input.trim();

  // Direct /profiles/<id> URL
  const profMatch = trimmed.match(/profiles\/(\d{17})/);
  if (profMatch) return profMatch[1];

  // Raw 17-digit SteamID64
  if (/^\d{17}$/.test(trimmed)) return trimmed;

  // Extract vanity name from /id/<vanity> or treat the whole input as a vanity
  let vanity: string | null = null;
  const idMatch = trimmed.match(/\/id\/([^/?#]+)/);
  if (idMatch) vanity = idMatch[1];
  else if (!trimmed.startsWith('http')) vanity = trimmed;

  if (!vanity) return null;

  try {
    const res = await fetch(`https://steamcommunity.com/id/${encodeURIComponent(vanity)}/?xml=1`);
    if (!res.ok) return null;
    const text = await res.text();
    const m = text.match(/<steamID64>(\d{17})<\/steamID64>/);
    return m ? m[1] : null;
  } catch (err) {
    logger.warn(`Failed to resolve vanity "${vanity}":`, err);
    return null;
  }
}
