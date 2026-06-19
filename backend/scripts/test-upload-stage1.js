/**
 * Stage 1 — photo upload via POST /upload/:incident_id
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
const FIXTURES = join(__dirname, 'fixtures');
mkdirSync(FIXTURES, { recursive: true });

const testPngPath = join(FIXTURES, 'test-photo.png');
if (!existsSync(testPngPath)) {
  writeFileSync(
    testPngPath,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    )
  );
}

async function createIncident() {
  const res = await fetch(`${BASE}/webhooks/vapi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        type: 'tool-calls',
        call: { id: 'call-stage1-upload', orgId: 'org-test', type: 'webCall' },
        toolCallList: [
          {
            id: 'tc_create_stage1',
            name: 'create_incident',
            parameters: {
              caller_name: 'Stage One Tester',
              caller_phone: '+15550001111',
              location: '100 Test Lane',
              incident_type: 'car_accident',
              raw_transcript: 'Stage 1 upload test incident.',
              immediate_danger: false,
              other_party_info: 'n/a',
            },
          },
        ],
      },
    }),
  });
  const body = await res.json();
  const parsed = JSON.parse(body.results[0].result);
  return parsed.incident_id;
}

async function main() {
  console.log('Creating incident...');
  const incidentId = await createIncident();
  console.log('incident_id:', incidentId);

  const pageRes = await fetch(`${BASE}/upload/${incidentId}`);
  console.log('\nGET /upload page status:', pageRes.status);
  const html = await pageRes.text();
  if (!html.includes(incidentId)) {
    console.error('FAIL: upload page missing incident_id');
    process.exit(1);
  }
  console.log('PASS: upload page shows incident_id');

  const form = new FormData();
  const bytes = readFileSync(testPngPath);
  form.append('photo', new Blob([bytes], { type: 'image/png' }), 'test-photo.png');

  const uploadRes = await fetch(`${BASE}/upload/${incidentId}`, {
    method: 'POST',
    body: form,
  });
  const uploadHtml = await uploadRes.text();
  console.log('\nPOST /upload status:', uploadRes.status);
  if (!uploadHtml.includes('Upload successful')) {
    console.error('FAIL: upload page did not show success');
    console.log(uploadHtml);
    process.exit(1);
  }

  const { data: row, error } = await insforge.database
    .from('incidents')
    .select('id, status, image_urls')
    .eq('id', incidentId)
    .single();

  if (error) {
    console.error('FAIL: could not read row:', error);
    process.exit(1);
  }

  console.log('\n--- InsForge row after upload ---');
  console.log(JSON.stringify(row, null, 2));

  if (!Array.isArray(row.image_urls) || row.image_urls.length === 0) {
    console.error('FAIL: image_urls empty');
    process.exit(1);
  }

  const url = row.image_urls[0];
  const urlCheck = await fetch(url);
  console.log('\nStorage URL fetch status:', urlCheck.status, url);

  if (!urlCheck.ok) {
    console.error('FAIL: storage URL not accessible');
    process.exit(1);
  }

  console.log('\nPASS: Stage 1 — image_urls has working storage URL');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
