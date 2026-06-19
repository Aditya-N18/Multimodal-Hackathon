/**
 * Live log monitor — tails /debug/logs on the API server (reliable live tail).
 * InsForge compute logs API is often stale; this reads the in-app ring buffer instead.
 *
 * Usage:
 *   npm run monitor              # production API logs
 *   npm run monitor:local        # localhost (run npm start first)
 *   npm run test:gemini-e2e      # hits production by default              # production (fly.dev)
 *   npm run monitor:local        # localhost:3001
 *   API_BASE_URL=... npm run monitor
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const PROD_API =
  'https://evidenceline-api-0e3b962d-641e-40eb-9df9-2e78323ae83a.fly.dev';

function loadConfig() {
  const project = JSON.parse(
    readFileSync(join(root, '.insforge', 'project.json'), 'utf8')
  );
  const localMode = process.argv.includes('--local');
  return {
    apiBaseUrl: localMode
      ? (process.env.API_BASE_URL ?? 'http://localhost:3001')
      : (process.env.API_BASE_URL ?? process.env.SERVER_URL ?? PROD_API),
    insforgeBaseUrl: process.env.INSFORGE_URL ?? project.oss_host,
    apiKey: process.env.INSFORGE_API_KEY ?? project.api_key,
    localMode,
  };
}

const { apiBaseUrl, insforgeBaseUrl, apiKey, localMode } = loadConfig();

const INSFORGE_SOURCES = ['postgREST.logs', 'postgres.logs'];
const API_POLL_MS = 1000;
const INSFORGE_POLL_MS = 5000;

const seenInsforgeIds = new Set();
let lastLogId = 0;

function fmtTime(ts) {
  return new Date(ts).toISOString();
}

function log(prefix, ts, message) {
  process.stdout.write(`${prefix} ${fmtTime(ts)} ${message}\n`);
}

async function insforgeFetch(path, params = {}) {
  const url = new URL(path, insforgeBaseUrl);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${path}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function pollApiLogs() {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/debug/logs?since=${lastLogId}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} GET /debug/logs: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  for (const line of data.lines ?? []) {
    lastLogId = Math.max(lastLogId, line.id);
    log('[API]', line.ts, line.message);
  }
}

async function pollInsforgeLogs() {
  for (const source of INSFORGE_SOURCES) {
    const data = await insforgeFetch(`/api/logs/${source}`, { limit: 20 });
    for (const entry of data.logs ?? []) {
      if (seenInsforgeIds.has(entry.id)) continue;
      seenInsforgeIds.add(entry.id);
      const level = entry.body?.metadata?.level ?? 'info';
      const msg = entry.eventMessage ?? entry.body?.event_message ?? '';
      const tag = source.replace('.logs', '').toUpperCase();
      log(`[${tag}]`, entry.timestamp, `[${level}] ${msg}`);
    }
  }
}

console.log('EvidenceLine monitor — streaming logs (Ctrl+C to stop)\n');
console.log(`  API target:     ${apiBaseUrl}/debug/logs${localMode ? ' (local)' : ' (production)'}`);
console.log(`  InsForge DB:    postgREST + postgres`);
console.log(`  Tip: npm run test:gemini-e2e hits the same API target\n`);

// Seed InsForge log IDs
try {
  for (const source of INSFORGE_SOURCES) {
    const data = await insforgeFetch(`/api/logs/${source}`, { limit: 30 });
    for (const entry of data.logs ?? []) seenInsforgeIds.add(entry.id);
  }
} catch (err) {
  console.error('[monitor] InsForge log seed failed:', err.message);
}

// Bootstrap API log cursor (show last few lines on start)
try {
  const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/debug/logs?since=0`);
  if (res.ok) {
    const data = await res.json();
    const all = data.lines ?? [];
    const tail = all.slice(-6);
    for (const line of tail) {
      log('[API]', line.ts, line.message);
      lastLogId = Math.max(lastLogId, line.id);
    }
  } else {
    console.error(
      `[monitor] /debug/logs not available yet (${res.status}). ` +
        'Deploy latest server code, or use npm run monitor:local with npm start.'
    );
  }
} catch (err) {
  console.error('[monitor] API bootstrap failed:', err.message);
}

async function loopApi() {
  for (;;) {
    try {
      await pollApiLogs();
    } catch (err) {
      console.error('[monitor] API poll error:', err.message);
    }
    await new Promise((r) => setTimeout(r, API_POLL_MS));
  }
}

async function loopInsforge() {
  for (;;) {
    try {
      await pollInsforgeLogs();
    } catch (err) {
      console.error('[monitor] InsForge poll error:', err.message);
    }
    await new Promise((r) => setTimeout(r, INSFORGE_POLL_MS));
  }
}

loopApi();
loopInsforge();
