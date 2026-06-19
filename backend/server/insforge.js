import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createAdminClient } from '@insforge/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

function loadProjectConfig() {
  const path = join(projectRoot, '.insforge', 'project.json');
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

const project = loadProjectConfig();

export const insforge = createAdminClient({
  baseUrl: process.env.INSFORGE_URL ?? project.oss_host,
  apiKey: process.env.INSFORGE_API_KEY ?? project.api_key,
});
