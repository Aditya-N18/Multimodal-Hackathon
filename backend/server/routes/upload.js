import { Router } from 'express';
import multer from 'multer';
import { Blob } from 'node:buffer';
import { insforge } from '../insforge.js';
import { analyzeIncident } from '../analyze-incident.js';
import { STORAGE_BUCKET } from '../config.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

function uploadPageHtml(incidentId, message = '') {
  return `<!DOCTYPE html>
<html>
<head><title>Upload photo — ${incidentId}</title></head>
<body>
  <h1>EvidenceLine photo upload</h1>
  <p><strong>Incident ID:</strong> ${incidentId}</p>
  ${message ? `<p>${message}</p>` : ''}
  <form action="/upload/${incidentId}" method="POST" enctype="multipart/form-data">
    <p><input type="file" name="photo" accept="image/*" required></p>
    <p><button type="submit">Upload photo</button></p>
  </form>
</body>
</html>`;
}

router.get('/upload/:incident_id', async (req, res) => {
  const { incident_id } = req.params;

  const { data: row, error } = await insforge.database
    .from('incidents')
    .select('id')
    .eq('id', incident_id)
    .single();

  if (error || !row) {
    return res.status(404).send(`Incident not found: ${incident_id}`);
  }

  return res.type('html').send(uploadPageHtml(incident_id));
});

router.post('/upload/:incident_id', upload.single('photo'), async (req, res) => {
  const { incident_id } = req.params;

  try {
    if (!req.file) {
      return res.status(400).type('html').send(
        uploadPageHtml(incident_id, 'Please choose an image file to upload.')
      );
    }

    const { data: row, error: fetchError } = await insforge.database
      .from('incidents')
      .select('id, image_urls')
      .eq('id', incident_id)
      .single();

    if (fetchError || !row) {
      return res.status(404).type('html').send(`Incident not found: ${incident_id}`);
    }

    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `incidents/${incident_id}/${Date.now()}-${safeName}`;
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });

    const { data: stored, error: storageError } = await insforge.storage
      .from(STORAGE_BUCKET)
      .upload(objectKey, blob);

    if (storageError || !stored?.url) {
      console.error('[upload] Storage failed:', storageError);
      return res.status(500).type('html').send(
        uploadPageHtml(incident_id, `Upload failed: ${storageError?.message ?? 'unknown error'}`)
      );
    }

    const existing = Array.isArray(row.image_urls) ? row.image_urls : [];
    const image_urls = [...existing, stored.url];

    const { error: updateError } = await insforge.database
      .from('incidents')
      .update({
        image_urls,
        status: 'analyzing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', incident_id);

    if (updateError) {
      console.error('[upload] DB update failed:', updateError);
      return res.status(500).type('html').send(
        uploadPageHtml(incident_id, `Saved file but failed to update incident: ${updateError.message}`)
      );
    }

    console.log('[upload] Photo stored:', { incident_id, url: stored.url, key: stored.key });

    await analyzeIncident(incident_id);

    return res.type('html').send(
      uploadPageHtml(
        incident_id,
        `Upload successful. Photo URL: ${stored.url}. Analysis complete — status is now report_ready.`
      )
    );
  } catch (err) {
    console.error('[upload] Unexpected error:', err);
    return res.status(500).type('html').send(
      uploadPageHtml(
        incident_id,
        `Upload failed: ${err instanceof Error ? err.message : 'unknown error'}`
      )
    );
  }
});

export default router;
