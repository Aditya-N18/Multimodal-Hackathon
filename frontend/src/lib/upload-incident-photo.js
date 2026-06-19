/** Fly.dev API base — POST multipart to /upload/:incident_id */
export const UPLOAD_API_BASE =
  import.meta.env.VITE_UPLOAD_API_BASE?.replace(/\/+$/, '') ||
  'https://evidenceline-api-0e3b962d-641e-40eb-9df9-2e78323ae83a.fly.dev'

/**
 * POST multipart/form-data with field name "photo" (required by multer).
 * @param {string} incidentId
 * @param {File} file
 */
export async function uploadIncidentPhoto(incidentId, file) {
  const formData = new FormData()
  formData.append('photo', file)

  const response = await fetch(`${UPLOAD_API_BASE}/upload/${incidentId}`, {
    method: 'POST',
    body: formData,
  })

  let body = null
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      body = await response.json()
    } catch {
      body = null
    }
  } else {
    body = { message: await response.text() }
  }

  if (!response.ok) {
    const message =
      body?.error ?? body?.message ?? `Upload failed (${response.status})`
    throw new Error(message)
  }

  return body
}
