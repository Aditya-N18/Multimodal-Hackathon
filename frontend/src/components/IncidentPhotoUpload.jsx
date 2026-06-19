import { Camera, FolderOpen } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { uploadIncidentPhoto } from '@/lib/upload-incident-photo'

export default function IncidentPhotoUpload({
  incidentId,
  caseNumber,
  onUploadSuccess,
}) {
  const galleryInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const uploadFile = async (file) => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      await uploadIncidentPhoto(incidentId, file)
      onUploadSuccess?.(incidentId)
    } catch (err) {
      setError(err?.message ?? 'Upload failed')
    } finally {
      setUploading(false)
      if (galleryInputRef.current) galleryInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
    }
  }

  const handleGalleryChange = (event) => {
    event.stopPropagation()
    const file = event.target.files?.[0]
    if (file) uploadFile(file)
  }

  const handleCameraChange = (event) => {
    event.stopPropagation()
    const file = event.target.files?.[0]
    if (file) uploadFile(file)
  }

  const openGallery = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!uploading) galleryInputRef.current?.click()
  }

  const openCamera = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!uploading) cameraInputRef.current?.click()
  }

  const stopBubble = (event) => {
    event.stopPropagation()
  }

  return (
    <div
      className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 backdrop-blur-sm"
      onClick={stopBubble}
    >
      <p className="text-sm font-medium text-amber-200">
        Photo upload needed — case {caseNumber ?? incidentId}
      </p>
      <p className="mt-1 text-xs text-amber-200/70">
        Choose an existing photo or take a new one with your camera.
      </p>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploading}
        onChange={handleGalleryChange}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={uploading}
        onChange={handleCameraChange}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={openGallery}
          className="rounded-full border-white/10 bg-white/5"
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          {uploading ? 'Uploading…' : 'Choose File'}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={uploading}
          onClick={openCamera}
          className="rounded-full bg-gradient-to-r from-amber-600 to-orange-600"
        >
          <Camera className="mr-2 h-4 w-4" />
          {uploading ? 'Uploading…' : 'Upload Photo'}
        </Button>
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
