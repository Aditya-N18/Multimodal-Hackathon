/**
 * Nebius Token Factory vision client (Person C integration).
 * Contract: nebius/contract.json
 * Python reference: nebius/analyze_incident.py
 */

import OpenAI from 'openai';
import { SYSTEM_PROMPT, buildUserMessage } from './prompts.js';

export const NEBIUS_BASE_URL = 'https://api.tokenfactory.nebius.com/v1/';
export const DEFAULT_MODEL =
  process.env.NEBIUS_VISION_MODEL ?? 'Qwen/Qwen2.5-VL-72B-Instruct';

const REQUIRED_KEYS = new Set([
  'hazard_evidence',
  'severity',
  'missing_evidence',
  'matches_description',
  'confidence',
]);
const VALID_SEVERITIES = new Set(['low', 'medium', 'high']);

function extractJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) {
    return JSON.parse(fenced[1]);
  }

  const brace = trimmed.match(/\{[\s\S]*\}/);
  if (brace) {
    return JSON.parse(brace[0]);
  }

  throw new Error(`Model did not return parseable JSON:\n${trimmed.slice(0, 500)}`);
}

function validateResult(data) {
  const missing = [...REQUIRED_KEYS].filter((key) => !(key in data));
  if (missing.length > 0) {
    throw new Error(`Response missing keys: ${missing.join(', ')}`);
  }

  if (!VALID_SEVERITIES.has(data.severity)) {
    throw new Error(`Invalid severity: ${data.severity}`);
  }

  if (!Array.isArray(data.hazard_evidence)) {
    throw new Error('hazard_evidence must be a list');
  }
  if (!Array.isArray(data.missing_evidence)) {
    throw new Error('missing_evidence must be a list');
  }
  if (typeof data.matches_description !== 'boolean') {
    throw new Error('matches_description must be boolean');
  }

  const confidence = Number(data.confidence);
  if (Number.isNaN(confidence) || confidence < 0 || confidence > 1) {
    throw new Error('confidence must be between 0.0 and 1.0');
  }

  return {
    hazard_evidence: data.hazard_evidence,
    severity: data.severity,
    missing_evidence: data.missing_evidence,
    matches_description: data.matches_description,
    confidence,
  };
}

async function fetchImageAsDataUri(imageUrl) {
  const res = await fetch(imageUrl, {
    headers: { 'User-Agent': 'EvidenceLine/1.0 (incident-photo-fetch)' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status})`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = (res.headers.get('content-type') ?? 'image/jpeg').split(';')[0];
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

async function callVisionModel(client, { model, incidentType, rawTranscript, location, imageUrl }) {
  const userText = buildUserMessage(
    incidentType ?? 'other',
    rawTranscript ?? '',
    location ?? ''
  );

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: 600,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content ?? '';
  return validateResult(extractJson(raw));
}

export function isNebiusConfigured() {
  const key = process.env.NEBIUS_API_KEY?.trim();
  return Boolean(key && key !== 'your_key_here');
}

/**
 * @param {object} params
 * @param {string} params.imageUrl - public HTTPS URL or data URI
 * @param {string} params.incidentType
 * @param {string} params.rawTranscript
 * @param {string} params.location
 */
export async function analyzeWithNebius({
  imageUrl,
  incidentType,
  rawTranscript,
  location,
  apiKey = process.env.NEBIUS_API_KEY,
  model = DEFAULT_MODEL,
}) {
  if (!apiKey?.trim() || apiKey.trim() === 'your_key_here') {
    throw new Error(
      'NEBIUS_API_KEY not set. Copy nebius/.env.example to .env and add your Token Factory key.'
    );
  }

  const client = new OpenAI({
    baseURL: NEBIUS_BASE_URL,
    apiKey: apiKey.trim(),
  });

  const payload = { model, incidentType, rawTranscript, location };

  try {
    return await callVisionModel(client, { ...payload, imageUrl });
  } catch (primaryErr) {
    // One fallback: Nebius often cannot fetch remote URLs (500). Re-send as base64.
    if (imageUrl.startsWith('data:')) {
      throw primaryErr;
    }

    console.warn(
      '[nebius] Primary image URL request failed, retrying with base64:',
      primaryErr instanceof Error ? primaryErr.message : primaryErr
    );

    const dataUri = await fetchImageAsDataUri(imageUrl);
    return await callVisionModel(client, { ...payload, imageUrl: dataUri });
  }
}

/**
 * Text-only key check (matches nebius/verify_key.py).
 */
export async function verifyNebiusKey(apiKey = process.env.NEBIUS_API_KEY) {
  if (!apiKey?.trim() || apiKey.trim() === 'your_key_here') {
    return { ok: false, error: 'NEBIUS_API_KEY not set' };
  }

  const client = new OpenAI({
    baseURL: NEBIUS_BASE_URL,
    apiKey: apiKey.trim(),
  });

  try {
    const response = await client.chat.completions.create({
      model: 'meta-llama/Llama-3.3-70B-Instruct',
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      max_tokens: 10,
    });
    const text = (response.choices[0]?.message?.content ?? '').trim();
    return { ok: true, text };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
