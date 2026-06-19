import { installLogCapture } from './log-buffer.js';
installLogCapture();

import './load-env.js';
import express from 'express';
import { handleCreateIncident } from './handlers/create-incident.js';
import { handleRequestPhotoUpload } from './handlers/request-photo-upload.js';
import { handleCheckIncidentStatus } from './handlers/check-incident-status.js';
import { extractToolCalls, vapiError } from './vapi.js';
import uploadRouter from './routes/upload.js';
import { getLogs } from './log-buffer.js';
import { insforge } from './insforge.js';
import { PORT } from './config.js';

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '2mb' }));
app.use(uploadRouter);

app.get('/debug/logs', (req, res) => {
  const since = Number(req.query.since ?? 0);
  res.json({ lines: getLogs(since) });
});

app.get('/api/incidents', async (_req, res) => {
  try {
    const { data, error } = await insforge.database
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ incidents: data ?? [] });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to fetch incidents',
    });
  }
});

app.post('/webhooks/vapi', async (req, res) => {
  console.log('[vapi] Incoming webhook body:', JSON.stringify(req.body, null, 2));

  const results = [];

  try {
    const message = req.body?.message;

    if (!message || message.type !== 'tool-calls') {
      console.log('[vapi] Non-tool-calls message; returning empty results');
      return res.status(200).json({ results: [] });
    }

    const toolCalls = extractToolCalls(req.body);

    for (const toolCall of toolCalls) {
      try {
        let result;

        switch (toolCall.name) {
          case 'create_incident':
            result = await handleCreateIncident(toolCall.id, toolCall.arguments);
            break;
          case 'request_photo_upload':
            result = await handleRequestPhotoUpload(toolCall.id, toolCall.arguments);
            break;
          case 'check_incident_status':
            result = await handleCheckIncidentStatus(toolCall.id, toolCall.arguments);
            break;
          default:
            console.log(`[vapi] Unhandled tool: ${toolCall.name}`);
            result = vapiError(toolCall.id, `Unhandled tool: ${toolCall.name}`);
        }

        results.push(result);
      } catch (err) {
        console.error(`[vapi] Handler error for ${toolCall.name}:`, err);
        results.push(
          vapiError(toolCall.id, err instanceof Error ? err.message : 'Unknown error')
        );
      }
    }
  } catch (err) {
    console.error('[vapi] Top-level webhook error:', err);
  }

  const responseBody = { results };
  console.log('[vapi] Response:', JSON.stringify(responseBody, null, 2));
  return res.status(200).json(responseBody);
});

app.listen(PORT, () => {
  console.log(`EvidenceLine server listening on http://localhost:${PORT}`);
  console.log(`Upload page: http://localhost:${PORT}/upload/{incident_id}`);
});
