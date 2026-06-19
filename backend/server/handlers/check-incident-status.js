import { insforge } from '../insforge.js';
import { vapiError, vapiSuccess } from '../vapi.js';

export async function handleCheckIncidentStatus(toolCallId, args) {
  const { incident_id } = args;

  if (!incident_id) {
    return vapiError(toolCallId, 'incident_id is required');
  }

  const { data: row, error } = await insforge.database
    .from('incidents')
    .select('id, status, case_number, responder_summary')
    .eq('id', incident_id)
    .single();

  if (error || !row) {
    return vapiError(
      toolCallId,
      `Incident not found for incident_id ${incident_id}`
    );
  }

  if (row.status !== 'report_ready') {
    return vapiSuccess(toolCallId, {
      status: row.status,
      processing: true,
      message:
        'Analysis is still in progress. Please wait a moment while we finish reviewing the evidence.',
    });
  }

  return vapiSuccess(toolCallId, {
    status: 'report_ready',
    case_number: row.case_number,
    responder_summary: row.responder_summary,
  });
}
