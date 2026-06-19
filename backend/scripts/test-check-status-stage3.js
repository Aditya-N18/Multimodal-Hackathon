/**
 * Stage 3 — check_incident_status at awaiting_photos vs report_ready
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.SERVER_URL ?? 'http://localhost:3001';
const testPngPath = join(__dirname, 'fixtures', 'test-photo.png');

async function vapiToolCall(toolCallId, name, parameters) {
  const res = await fetch(`${BASE}/webhooks/vapi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        type: 'tool-calls',
        call: { id: 'call-stage3', orgId: 'org-test', type: 'webCall' },
        toolCallList: [{ id: toolCallId, name, parameters }],
      },
    }),
  });
  return { status: res.status, body: await res.json() };
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

  const create = await vapiToolCall('tc_create_s3', 'create_incident', {
    caller_name: 'Status Check Tester',
    caller_phone: '+15550003333',
    location: '300 Status Blvd',
    incident_type: 'workplace',
    raw_transcript: 'Workplace injury during equipment maintenance.',
    immediate_danger: false,
    other_party_info: 'Supervisor on scene',
  });

  const { incident_id } = JSON.parse(create.body.results[0].result);
  console.log('incident_id:', incident_id);

  await vapiToolCall('tc_photo_s3', 'request_photo_upload', { incident_id });

  const early = await vapiToolCall('tc_check_early', 'check_incident_status', {
    incident_id,
  });

  console.log('\n--- Early check (awaiting_photos) ---');
  console.log('HTTP:', early.status);
  console.log(JSON.stringify(early.body, null, 2));

  const earlyParsed = JSON.parse(early.body.results[0].result);
  if (early.status !== 200 || !earlyParsed.processing) {
    console.error('FAIL: early check should indicate processing');
    process.exit(1);
  }

  const form = new FormData();
  form.append(
    'photo',
    new Blob([readFileSync(testPngPath)], { type: 'image/png' }),
    'test-photo.png'
  );
  await fetch(`${BASE}/upload/${incident_id}`, { method: 'POST', body: form });

  const ready = await vapiToolCall('tc_check_ready', 'check_incident_status', {
    incident_id,
  });

  console.log('\n--- Ready check (report_ready) ---');
  console.log('HTTP:', ready.status);
  console.log(JSON.stringify(ready.body, null, 2));

  const readyParsed = JSON.parse(ready.body.results[0].result);
  if (
    ready.status !== 200 ||
    readyParsed.status !== 'report_ready' ||
    !readyParsed.responder_summary ||
    !readyParsed.case_number
  ) {
    console.error('FAIL: ready check should return report_ready summary');
    process.exit(1);
  }

  console.log('\nPASS: Stage 3 — both check_incident_status responses correct');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
