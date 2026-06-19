/**
 * Stage 2 test — create_incident end-to-end.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createAdminClient } from '@insforge/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const project = JSON.parse(
  readFileSync(join(__dirname, '..', '.insforge', 'project.json'), 'utf8')
);

const insforge = createAdminClient({
  baseUrl: project.oss_host,
  apiKey: project.api_key,
});

const WEBHOOK_URL = process.env.WEBHOOK_URL ?? 'http://localhost:3001/webhooks/vapi';

const payload = {
  message: {
    type: 'tool-calls',
    call: {
      id: 'call-test-stage2',
      orgId: 'org-test',
      type: 'webCall',
    },
    toolCallList: [
      {
        id: 'call_stage2_create_incident_001',
        name: 'create_incident',
        parameters: {
          caller_name: 'Alex Rivera',
          caller_phone: '+14085550199',
          location: 'I-280 southbound near exit 12',
          incident_type: 'car_accident',
          raw_transcript:
            'Caller reports a two-car collision in the right lane with minor injuries.',
          immediate_danger: true,
          other_party_info: 'White sedan, license plate unknown',
        },
      },
    ],
  },
};

console.log('Sending create_incident webhook...');
const res = await fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const body = await res.json();
console.log('\n--- Webhook response ---');
console.log('HTTP status:', res.status);
console.log(JSON.stringify(body, null, 2));

if (res.status !== 200) {
  console.error('FAIL: expected HTTP 200');
  process.exit(1);
}

const result = body.results?.[0];
if (!result?.toolCallId || result.toolCallId !== 'call_stage2_create_incident_001') {
  console.error('FAIL: toolCallId mismatch');
  process.exit(1);
}

if (result.error) {
  console.error('FAIL: handler returned error:', result.error);
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(result.result);
} catch {
  console.error('FAIL: result is not valid JSON string');
  process.exit(1);
}

if (!parsed.incident_id || !parsed.case_number) {
  console.error('FAIL: result missing incident_id or case_number');
  process.exit(1);
}

console.log('\nParsed result:', parsed);

const { data: row, error } = await insforge.database
  .from('incidents')
  .select('*')
  .eq('id', parsed.incident_id)
  .single();

if (error) {
  console.error('FAIL: could not fetch row from InsForge:', error);
  process.exit(1);
}

console.log('\n--- InsForge row ---');
console.log(JSON.stringify(row, null, 2));

const checks = [
  ['caller_name', row.caller_name, 'Alex Rivera'],
  ['caller_phone', row.caller_phone, '+14085550199'],
  ['location', row.location, 'I-280 southbound near exit 12'],
  ['incident_type', row.incident_type, 'car_accident'],
  ['raw_transcript', row.raw_transcript, payload.message.toolCallList[0].parameters.raw_transcript],
  ['immediate_danger', row.immediate_danger, true],
  ['other_party_info', row.other_party_info, 'White sedan, license plate unknown'],
  ['status', row.status, 'new'],
  ['case_number', row.case_number, parsed.case_number],
];

let failed = false;
for (const [field, actual, expected] of checks) {
  if (actual !== expected) {
    console.error(`FAIL: ${field} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
    failed = true;
  }
}

if (!/^\d{4}$/.test(row.case_number)) {
  console.error('FAIL: case_number is not a 4-digit string');
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log('\nPASS: Stage 2 — webhook response and InsForge row both verified');
