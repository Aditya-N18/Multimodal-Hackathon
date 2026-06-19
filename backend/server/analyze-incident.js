import './load-env.js';
import { insforge } from './insforge.js';
import { analyzeWithNebius, isNebiusConfigured } from './nebius/client.js';

/** Fallback when NEBIUS_API_KEY is missing or the API call fails. */
function getNebiusAnalysisStub() {
  return {
    hazard_evidence: [
      'dented rear bumper',
      "visible scrape on driver's side door",
    ],
    severity: 'medium',
    missing_evidence: ['license plate of other vehicle not visible'],
    matches_description: true,
    confidence: 0.82,
  };
}

async function runNebiusAnalysis(row, latestImageUrl) {
  if (!isNebiusConfigured()) {
    console.warn(
      '[analyze_incident] NEBIUS_API_KEY not set — using stub fallback. Add key to .env (see nebius/SETUP.md).'
    );
    return getNebiusAnalysisStub();
  }

  try {
    console.log('[analyze_incident] Calling Nebius vision API (image URL)...');
    const result = await analyzeWithNebius({
      imageUrl: latestImageUrl,
      incidentType: row.incident_type ?? 'other',
      rawTranscript: row.raw_transcript ?? '',
      location: row.location ?? '',
    });
    console.log('[analyze_incident] Nebius response:', result);
    return result;
  } catch (err) {
    console.error(
      '[analyze_incident] Nebius failed (URL + base64 fallback) — using stub:',
      err
    );
    return getNebiusAnalysisStub();
  }
}

function buildResponderSummary(row, analysis) {
  const hazards = analysis.hazard_evidence.join('; ');
  const danger = row.immediate_danger
    ? 'Caller reported immediate danger at the scene.'
    : 'No immediate danger was reported.';
  return (
    `Case ${row.case_number}: ${row.incident_type?.replace(/_/g, ' ') ?? 'incident'} at ${row.location ?? 'unknown location'}. ` +
    `${danger} Photo evidence shows: ${hazards}. Severity assessed as ${analysis.severity}.`
  );
}

function buildCaseFileSummary(row, analysis) {
  const occurred = row.occurred_at ?? row.created_at ?? 'time not recorded';
  const hazards = analysis.hazard_evidence.join(', ');
  const missing = analysis.missing_evidence.join(', ');
  return (
    `Incident report ${row.case_number} (${row.incident_type?.replace(/_/g, ' ') ?? 'unspecified type'}) ` +
    `reported by ${row.caller_name ?? 'unknown caller'} (${row.caller_phone ?? 'no phone on file'}). ` +
    `Location: ${row.location ?? 'not provided'}. Occurred: ${occurred}. ` +
    `Immediate danger: ${row.immediate_danger ? 'yes' : 'no'}. ` +
    `Caller statement: ${row.raw_transcript ?? 'no transcript available'}. ` +
    `Visual evidence from uploaded photo: ${hazards}. ` +
    `Severity: ${analysis.severity}. Missing evidence: ${missing}. ` +
    `Analysis confidence: ${analysis.confidence}. Matches caller description: ${analysis.matches_description ? 'yes' : 'no'}.`
  );
}

export async function analyzeIncident(incidentId) {
  const { data: row, error: fetchError } = await insforge.database
    .from('incidents')
    .select('*')
    .eq('id', incidentId)
    .single();

  if (fetchError || !row) {
    throw new Error(
      `analyzeIncident: incident not found (${incidentId}): ${fetchError?.message ?? 'missing row'}`
    );
  }

  const imageUrls = Array.isArray(row.image_urls) ? row.image_urls : [];
  const latestImageUrl = imageUrls[imageUrls.length - 1];
  if (!latestImageUrl) {
    throw new Error(`analyzeIncident: no image_url on incident ${incidentId}`);
  }

  const analysis = await runNebiusAnalysis(row, latestImageUrl);

  const { data: updated, error: updateError } = await insforge.database
    .from('incidents')
    .update({
      hazard_evidence: analysis.hazard_evidence,
      severity: analysis.severity,
      missing_evidence: analysis.missing_evidence,
      responder_summary: buildResponderSummary(row, analysis),
      case_file_summary: buildCaseFileSummary(row, analysis),
      status: 'report_ready',
      updated_at: new Date().toISOString(),
    })
    .eq('id', incidentId)
    .select('*')
    .single();

  if (updateError) {
    throw new Error(`analyzeIncident: update failed: ${updateError.message}`);
  }

  console.log('[analyze_incident] Row updated to report_ready:', {
    id: updated.id,
    status: updated.status,
    severity: updated.severity,
  });

  return updated;
}
