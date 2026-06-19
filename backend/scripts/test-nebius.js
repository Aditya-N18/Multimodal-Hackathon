#!/usr/bin/env node
/**
 * Test Nebius integration — key check + optional vision smoke test.
 *
 * Usage:
 *   npm run test:nebius              # verify API key only
 *   npm run test:nebius -- --vision  # also run vision smoke test
 */

import '../server/load-env.js';
import {
  analyzeWithNebius,
  isNebiusConfigured,
  verifyNebiusKey,
} from '../server/nebius/client.js';

const runVision = process.argv.includes('--vision');

const TEST_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Car_accident.jpg/800px-Car_accident.jpg';

async function main() {
  console.log('Nebius configured:', isNebiusConfigured());

  if (!isNebiusConfigured()) {
    console.log('\nNEBIUS_API_KEY is not set.');
    console.log('1. Copy .env.example to .env (or nebius/.env.example to nebius/.env)');
    console.log('2. Paste your key from https://tokenfactory.nebius.com');
    console.log('3. Re-run: npm run test:nebius');
    process.exit(1);
  }

  console.log('\n--- Step 1: verify API key (text) ---');
  const verify = await verifyNebiusKey();
  if (!verify.ok) {
    console.error('FAIL:', verify.error);
    process.exit(1);
  }
  console.log('PASS: Nebius key works, response:', verify.text);

  if (!runVision) {
    console.log('\nSkipping vision test. Run: npm run test:nebius -- --vision');
    return;
  }

  console.log('\n--- Step 2: vision smoke test ---');
  const result = await analyzeWithNebius({
    imageUrl: TEST_IMAGE,
    incidentType: 'car_accident',
    rawTranscript:
      "I was rear-ended at a stop light. I'm okay but my car is damaged.",
    location: 'Market St, San Francisco',
  });
  console.log(JSON.stringify(result, null, 2));
  console.log('\nPASS: Nebius vision analysis works');
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
