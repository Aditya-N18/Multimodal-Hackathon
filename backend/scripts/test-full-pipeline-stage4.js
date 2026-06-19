/**
 * Stage 4 — full pipeline: create → request_photo_upload → upload → check_status
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAdminClient } from '@insforge/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const project = JSON.parse(
  readFileSync(join(__dirname, '..', '.insforge', 'project.json'), 'utf8')
);
const insforge = createAdminClient({
  baseUrl: project.oss_host,
  apiKey: project.api_key,
});

const BASE = process.env.SERVER_URL ?? 'http://localhost:3001';
const testPngPath = join(__dirname, 'fixtures', 'test-photo.png');

async function vapiToolCall(toolCallId, name, parameters) {
  const res = await fetch(`${BASE}/webhooks/vapi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        type: 'tool-calls',
        call: { id: 'call-stage4', orgId: 'org-test', type: 'webCall' },
        toolCallList: [{ id: toolCallId, name, parameters }],
      },
    }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function main() {
  mkdirSync(join(__dirname, 'fixtures'), { recursive: true });
  if (!existsSync(testPngPath)) {
    writeFileSync(
      testPngPath,
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'base64'
      )
    );
  }

  console.log('=== Step 1: create_incident ===');
  const step1 = await vapiToolCall('tc_s4_create', 'create_incident', {
    caller_name: 'Full Pipeline Tester',
    caller_phone: '+15550004444',
    location: '400 Pipeline Rd',
    incident_type: 'property_damage',
    raw_transcript: 'Fence damaged by falling tree branch during storm.',
    immediate_danger: false,
    other_party_info: 'Neighbor property also affected',
  });
  console.log(JSON.stringify(step1, null, 2));
  const { incident_id, case_number } = JSON.parse(step1.body.results[0].result);

  console.log('\n=== Step 2: request_photo_upload ===');
  const step2 = await vapiToolCall('tc_s4_photo', 'request_photo_upload', {
    incident_id,
  });
  console.log(JSON.stringify(step2, null, 2));

  console.log('\n=== Step 3: POST /upload (photo) ===');
  const form = new FormData();
  form.append(
    'photo',
    new Blob([readFileSync(testPngPath)], { type: 'image/png' }),
    'test-photo.png'
  );
  const uploadRes = await fetch(`${BASE}/upload/${incident_id}`, {
    method: 'POST',
    body: form,
  });
  console.log('Upload HTTP:', uploadRes.status);
  console.log('Upload body snippet:', (await uploadRes.text()).slice(0, 200));

  console.log('\n=== Step 4: check_incident_status ===');
  const step4 = await vapiToolCall('tc_s4_check', 'check_incident_status', {
    incident_id,
  });
  console.log(JSON.stringify(step4, null, 2));

  const check = JSON.parse(step4.body.results[0].result);
  if (check.status !== 'report_ready' || check.case_number !== case_number) {
    console.error('FAIL: final check_incident_status incorrect');
    process.exit(1);
  }

  const { data: row } = await insforge.database
    .from('incidents')
    .select('*')
    .eq('id', incident_id)
    .single();

  console.log('\n=== Final InsForge row ===');
  console.log(JSON.stringify(row, null, 2));

  console.log('\nPASS: Stage 4 — full pipeline end to end');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
