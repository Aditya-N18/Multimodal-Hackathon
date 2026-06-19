/**
 * Stage 2 — upload triggers analyze-incident stub → report_ready
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

async function createAndUpload() {
  const createRes = await fetch(`${BASE}/webhooks/vapi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        type: 'tool-calls',
        call: { id: 'call-stage2-analyze', orgId: 'org-test', type: 'webCall' },
        toolCallList: [
          {
            id: 'tc_create_stage2',
            name: 'create_incident',
            parameters: {
              caller_name: 'Analyze Pipeline Tester',
              caller_phone: '+15550002222',
              location: '200 Analysis Ave',
              incident_type: 'slip_fall',
              raw_transcript: 'Caller slipped on wet floor in lobby.',
              immediate_danger: true,
              other_party_info: 'Building management notified',
            },
          },
        ],
      },
    }),
  });
  const createBody = await createRes.json();
  const { incident_id } = JSON.parse(createBody.results[0].result);

  const form = new FormData();
  const bytes = readFileSync(testPngPath);
  form.append('photo', new Blob([bytes], { type: 'image/png' }), 'test-photo.png');
  await fetch(`${BASE}/upload/${incident_id}`, { method: 'POST', body: form });

  return incident_id;
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

  const incidentId = await createAndUpload();
  const { data: row, error } = await insforge.database
    .from('incidents')
    .select('*')
    .eq('id', incidentId)
    .single();

  if (error) {
    console.error('FAIL:', error);
    process.exit(1);
  }

  console.log('--- Final row after auto-analyze ---');
  console.log(JSON.stringify(row, null, 2));

  const checks = [
    ['status', row.status, 'report_ready'],
    ['severity', row.severity, 'medium'],
    ['hazard_evidence length', row.hazard_evidence?.length, 2],
    ['missing_evidence length', row.missing_evidence?.length, 1],
    ['responder_summary', !!row.responder_summary, true],
    ['case_file_summary', !!row.case_file_summary, true],
  ];

  let failed = false;
  for (const [label, actual, expected] of checks) {
    if (actual !== expected) {
      console.error(`FAIL: ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      failed = true;
    }
  }

  if (failed) process.exit(1);
  console.log('\nPASS: Stage 2 — automatic analyze-incident stub filled row and set report_ready');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
