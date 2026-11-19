/**
 * Checked once at startup, so a missing secret fails the boot with a clear
 * list instead of surfacing hours later as every photo upload failing.
 *
 * Only presence (and minimal shape) is checked. Values are never logged.
 */
const ALWAYS_REQUIRED = [
  'MONGODB_URI',
  'SOURCE_USERNAME',
  'SOURCE_PASSWORD',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

/**
 * The Telegram bot and admin API exist only in the long-running service. The
 * bot cannot do its one job (site + channel) without any of these.
 */
const SERVICE_REQUIRED = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHANNEL_ID',
  'CATALOGUE_API_URL',
  'CATALOGUE_IMPORT_TOKEN',
  'SITE_URL',
];

export function validateEnv(env: Record<string, unknown>, opts: { service: boolean }) {
  const blank = (k: string) => !String(env[k] ?? '').trim();
  const problems = [...ALWAYS_REQUIRED, ...(opts.service ? SERVICE_REQUIRED : [])]
    .filter(blank)
    .map((k) => `${k} is not set`);

  const base = String(env.SOURCE_BASE_URL ?? '').trim();
  if (base && !/^https?:\/\//.test(base)) problems.push('SOURCE_BASE_URL must start with http:// or https://');

  const delay = env.REQUEST_DELAY_MS;
  if (delay !== undefined && delay !== '' && !(Number(delay) >= 0)) problems.push('REQUEST_DELAY_MS must be a number >= 0');

  if (problems.length) {
    throw new Error(`Invalid configuration:\n  - ${problems.join('\n  - ')}\nSee .env.example.`);
  }
  return env;
}
