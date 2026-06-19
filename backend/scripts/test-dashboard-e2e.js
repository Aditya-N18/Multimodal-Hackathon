/**
 * Dashboard + API end-to-end test (no browser).
 *
 * Verifies:
 *   1. GET /api/incidents
 *   2. Full pipeline (create → photo request → upload → report_ready)
 *   3. Realtime trigger fires on INSERT/UPDATE (optional if anon key set)
 *
 * Usage:
 *   npm run test:dashboard-e2e
 *   SERVER_URL=http://localhost:3001 npm run test:dashboard-e2e
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAdminClient, createClient } from '@insforge/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const GEMINI_IMAGE = join(ROOT, 'Gemini_Generated_Image_h0hmxph0hmxph0hm.png');
const PROD_API =
  'https://evidenceline-api-0e3b962d-641e-40eb-9df9-2e78323ae83a.fly.dev';
const BASE = process.env.SERVER_URL ?? process.env.API_BASE_URL ?? PROD_API;
const REALTIME_CHANNEL = 'evidenceline:incidents';

const project = JSON.parse(
  readFileSync(join(ROOT, '.insforge', 'project.json'), 'utf8')
);
const admin = createAdminClient({
  baseUrl: project.oss_host,
  apiKey: project.api_key,
});

async function vapiToolCall(toolCallId, name, parameters) {
  const res = await fetch(`${BASE}/webhooks/vapi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        type: 'tool-calls',
        call: { id: 'call-dashboard-e2e', orgId: 'org-test', type: 'webCall' },
        toolCallList: [{ id: toolCallId, name, parameters }],
      },
    }),
  });
  return { status: res.status, body: await res.json() };
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function testIncidentsApi() {
  console.log('\n=== Step 0: GET /api/incidents ===');
  const res = await fetch(`${BASE}/api/incidents`);
  if (res.status === 404) {
    throw new Error(
      '/api/incidents not found — deploy latest backend (compute deploy) and retry'
    );
  }
  if (!res.ok) {
    throw new Error(`/api/incidents failed: ${res.status}`);
  }
  const body = await res.json();
  if (!Array.isArray(body.incidents)) {
    throw new Error('Expected { incidents: [] }');
  }
  console.log(`OK: ${body.incidents.length} incidents returned`);
}

async function testRealtimeDuringPipeline(incidentId, runPipeline) {
  const anonKey = process.env.INSFORGE_ANON_KEY;
  if (!anonKey) {
    console.log('\n=== Realtime (skipped — set INSFORGE_ANON_KEY to test live feed) ===');
    await runPipeline();
    return;
  }

  console.log('\n=== Realtime: subscribe before upload ===');
  const client = createClient({ baseUrl: project.oss_host, anonKey });
  const { realtime } = client;

  const events = [];
  const onEvent = (message) => {
    const row = message?.payload?.new ?? message?.new;
    if (row?.id === incidentId) {
      events.push(row.status);
      console.log('Realtime event for incident', incidentId, 'status:', row.status);
    }
  };

  realtime.on('INSERT', onEvent);
  realtime.on('UPDATE', onEvent);
  await realtime.connect();
  const sub = await realtime.subscribe(REALTIME_CHANNEL);
  if (!sub.ok) {
    throw new Error(`Realtime subscribe failed: ${sub.error?.message ?? 'unknown'}`);
  }

  await runPipeline();
  await wait(3000);

  realtime.unsubscribe(REALTIME_CHANNEL);
  realtime.disconnect();

  if (events.length === 0) {
    console.warn('WARN: no Realtime events (check anon key + channel permissions)');
  } else {
    console.log('OK: Realtime events:', events.join(' → '));
  }
}

async function main() {
  console.log('API base:', BASE);
  await testIncidentsApi();

  const imageBytes = readFileSync(GEMINI_IMAGE);
  console.log('\n=== Step 1: create_incident ===');
  const step1 = await vapiToolCall('tc_dash_create', 'create_incident', {
    caller_name: 'Dashboard E2E Tester',
    caller_phone: '+15551234567',
    location: 'Test location — dashboard E2E',
    incident_type: 'property_damage',
    raw_transcript: 'Testing dashboard pipeline end to end.',
    immediate_danger: false,
    other_party_info: 'None',
  });

  const createResult = JSON.parse(step1.body.results[0].result);
  const { incident_id, case_number } = createResult;
  console.log('incident_id:', incident_id, 'case_number:', case_number);

  console.log('\n=== Step 2: request_photo_upload ===');
  await vapiToolCall('tc_dash_photo', 'request_photo_upload', { incident_id });

  await testRealtimeDuringPipeline(incident_id, async () => {
    console.log('\n=== Step 3: POST /upload ===');
    const form = new FormData();
    form.append(
      'photo',
      new Blob([imageBytes], { type: 'image/png' }),
      'test.png'
    );
    const uploadRes = await fetch(`${BASE}/upload/${incident_id}`, {
      method: 'POST',
      body: form,
    });
    const uploadHtml = await uploadRes.text();
    if (!uploadHtml.includes('Upload successful')) {
      throw new Error('Upload did not succeed');
    }
    console.log('OK: upload + analysis');
  });

  console.log('\n=== Step 4: verify via /api/incidents ===');
  const listRes = await fetch(`${BASE}/api/incidents`);
  const { incidents } = await listRes.json();
  const row = incidents.find((i) => i.id === incident_id);
  if (!row || row.status !== 'report_ready') {
    throw new Error(`Expected report_ready in API list, got ${row?.status}`);
  }
  if (!row.responder_summary) {
    throw new Error('Missing responder_summary on API row');
  }
  console.log('OK: incident visible in dashboard API with report_ready');

  const { data: dbRow } = await admin.database
    .from('incidents')
    .select('*')
    .eq('id', incident_id)
    .single();

  console.log('\n=== PASS: dashboard E2E ===');
  console.log('Case #' + case_number);
  console.log('View in dashboard after refresh — incident should appear with View report button');
  console.log(JSON.stringify({ id: incident_id, status: dbRow?.status, case_number }, null, 2));
}

main().catch((err) => {
  console.error('FAIL:', err.message ?? err);
  process.exit(1);
});
