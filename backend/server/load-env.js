import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Project root .env (preferred)
config({ path: join(root, '.env') });
// Person C's nebius/.env (fallback)
if (!process.env.NEBIUS_API_KEY && existsSync(join(root, 'nebius', '.env'))) {
  config({ path: join(root, 'nebius', '.env') });
}
