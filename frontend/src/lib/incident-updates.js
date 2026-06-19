/** Detect status transition TO awaiting_photos (not any update). */
export function isAwaitingPhotosTransition(previousStatus, nextStatus) {
  return nextStatus === 'awaiting_photos' && previousStatus !== 'awaiting_photos'
}

/** Extract incident row from InsForge Realtime payload shapes. */
export function extractIncidentFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return null

  const record =
    payload.record ??
    payload.new ??
    payload.data?.record ??
    payload.data ??
    payload

  if (record?.id && record?.status != null) {
    return record
  }

  return null
}

/**
 * Merge a partial/full row update into the incidents list.
 * Returns null if the list should be refetched instead.
 */
export function mergeIncidentUpdate(incidents, updated) {
  const index = incidents.findIndex((row) => row.id === updated.id)
  if (index === -1) return null
  const next = [...incidents]
  next[index] = { ...next[index], ...updated }
  return next
}
