import { insforge } from '../insforge.js';
import { vapiError, vapiSuccess } from '../vapi.js';

function generateCaseNumber() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function handleCreateIncident(toolCallId, args) {
  const {
    caller_name,
    caller_phone,
    location,
    incident_type,
    raw_transcript,
    immediate_danger,
    other_party_info,
  } = args;

  const case_number = generateCaseNumber();

  const { data, error } = await insforge.database
    .from('incidents')
    .insert([
      {
        caller_name,
        caller_phone,
        location,
        incident_type,
        raw_transcript,
        immediate_danger: immediate_danger ?? false,
        other_party_info,
        case_number,
        status: 'new',
      },
    ])
    .select('id, case_number, status, caller_name, caller_phone, location, incident_type, raw_transcript, immediate_danger, other_party_info')
    .single();

  if (error) {
    console.error('[create_incident] InsForge insert failed:', error);
    return vapiError(toolCallId, `Failed to create incident: ${error.message}`);
  }

  console.log('[create_incident] Inserted row:', data);

  return vapiSuccess(toolCallId, {
    incident_id: data.id,
    case_number: data.case_number,
  });
}
