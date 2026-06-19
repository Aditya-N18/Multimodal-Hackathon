/**
 * End-to-end test using the Gemini-generated photo in the project root.
 *
 * Usage:
 *   npm start   # in another terminal
 *   npm run test:gemini-e2e
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAdminClient } from '@insforge/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const GEMINI_IMAGE = join(ROOT, 'Gemini_Generated_Image_h0hmxph0hmxph0hm.png');
const PROD_API =
  'https://evidenceline-api-0e3b962d-641e-40eb-9df9-2e78323ae83a.fly.dev';
const BASE = process.env.SERVER_URL ?? process.env.API_BASE_URL ?? PROD_API;

const project = JSON.parse(
  readFileSync(join(ROOT, '.insforge', 'project.json'), 'utf8')
);
const insforge = createAdminClient({
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
        call: { id: 'call-gemini-e2e', orgId: 'org-test', type: 'webCall' },
        toolCallList: [{ id: toolCallId, name, parameters }],
      },
    }),
  });
  return { status: res.status, body: await res.json() };
}

async function main() {
  const imageBytes = readFileSync(GEMINI_IMAGE);

  console.log('Using image:', GEMINI_IMAGE);
  console.log('Image size:', `${(imageBytes.length / 1024).toFixed(1)} KB`);

  console.log('\n=== Step 1: create_incident ===');
  const step1 = await vapiToolCall('tc_gemini_create', 'create_incident', {
    caller_name: 'Gemini Photo Tester',
    caller_phone: '+15559876543',
    location: 'Oak Street apartment bathroom',
    incident_type: 'slip_fall',
    raw_transcript:
      'I slipped in my bathroom and hit my arm on the counter. I took a photo right after.',
    immediate_danger: false,
    other_party_info: 'No other parties involved',
  });
  console.log(JSON.stringify(step1, null, 2));

  const createResult = JSON.parse(step1.body.results[0].result);
  const { incident_id, case_number } = createResult;
  console.log('incident_id:', incident_id);
  console.log('case_number:', case_number);
  console.log('upload page:', `${BASE}/upload/${incident_id}`);

  console.log('\n=== Step 2: request_photo_upload ===');
  const step2 = await vapiToolCall('tc_gemini_photo', 'request_photo_upload', {
    incident_id,
  });
  console.log(JSON.stringify(step2, null, 2));

  console.log('\n=== Step 3: POST /upload (Gemini image) ===');
  const form = new FormData();
  form.append(
    'photo',
    new Blob([imageBytes], { type: 'image/png' }),
    'Gemini_Generated_Image_h0hmxph0hmxph0hm.png'
  );
  const uploadRes = await fetch(`${BASE}/upload/${incident_id}`, {
    method: 'POST',
    body: form,
  });
  const uploadHtml = await uploadRes.text();
  console.log('Upload HTTP:', uploadRes.status);
  console.log(
    uploadHtml.includes('Upload successful')
      ? 'Upload page: success message shown'
      : 'Upload page body (first 300 chars):',
    uploadHtml.slice(0, 300)
  );

  if (!uploadHtml.includes('Upload successful')) {
    console.error('FAIL: upload did not succeed');
    process.exit(1);
  }

  console.log('\n=== Step 4: check_incident_status ===');
  const step4 = await vapiToolCall('tc_gemini_check', 'check_incident_status', {
    incident_id,
  });
  console.log(JSON.stringify(step4, null, 2));

  const check = JSON.parse(step4.body.results[0].result);
  if (check.status !== 'report_ready') {
    console.error('FAIL: expected report_ready, got', check.status);
    process.exit(1);
  }

  const { data: row, error } = await insforge.database
    .from('incidents')
    .select('*')
    .eq('id', incident_id)
    .single();

  if (error) {
    console.error('FAIL: could not fetch row', error);
    process.exit(1);
  }

  console.log('\n=== Final InsForge row ===');
  console.log(JSON.stringify(row, null, 2));

  if (!row.image_urls?.length || !row.hazard_evidence?.length || !row.responder_summary) {
    console.error('FAIL: row missing expected analysis fields');
    process.exit(1);
  }

  console.log('\nPASS: Gemini image end-to-end pipeline');
  console.log('\nOpen upload page in browser next time:');
  console.log(`  ${BASE}/upload/${incident_id}`);
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
