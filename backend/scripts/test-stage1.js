/**
 * Stage 1 test — skeleton webhook with empty results.
 * Payload shape from https://docs.vapi.ai/server-url/events (tool-calls).
 */

const WEBHOOK_URL = process.env.WEBHOOK_URL ?? 'http://localhost:3001/webhooks/vapi';

const payload = {
  message: {
    type: 'tool-calls',
    call: {
      id: 'call-test-stage1',
      orgId: 'org-test',
      type: 'webCall',
    },
    toolCallList: [],
  },
};

const res = await fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const body = await res.json();

console.log('HTTP status:', res.status);
console.log('Response body:', JSON.stringify(body, null, 2));

if (res.status !== 200) {
  console.error('FAIL: expected HTTP 200');
  process.exit(1);
}

if (!Array.isArray(body.results)) {
  console.error('FAIL: response missing results array');
  process.exit(1);
}

console.log('PASS: Stage 1 response shape is valid');
