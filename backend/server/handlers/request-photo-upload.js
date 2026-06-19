import { insforge } from '../insforge.js';
import { UPLOAD_BASE_URL } from '../config.js';
import { vapiError, vapiSuccess } from '../vapi.js';

export async function handleRequestPhotoUpload(toolCallId, args) {
  const { incident_id } = args;

  if (!incident_id) {
    return vapiError(toolCallId, 'incident_id is required');
  }

  const { data: row, error } = await insforge.database
    .from('incidents')
    .select('id, caller_phone, status')
    .eq('id', incident_id)
    .single();

  if (error || !row) {
    return vapiError(
      toolCallId,
      `Incident not found for incident_id ${incident_id}`
    );
  }

  const uploadUrl = `${UPLOAD_BASE_URL}/upload/${incident_id}`;

  console.log(
    `[STUBBED SMS] To: ${row.caller_phone ?? '(no phone on file)'} | Message: ` +
      `EvidenceLine: please upload photos of the incident here: ${uploadUrl}`
  );

  const { error: updateError } = await insforge.database
    .from('incidents')
    .update({ status: 'awaiting_photos', updated_at: new Date().toISOString() })
    .eq('id', incident_id);

  if (updateError) {
    return vapiError(
      toolCallId,
      `Failed to update incident status: ${updateError.message}`
    );
  }

  return vapiSuccess(toolCallId, {
    incident_id,
    upload_url: uploadUrl,
    message: 'Photo upload link has been sent to the caller.',
  });
}
