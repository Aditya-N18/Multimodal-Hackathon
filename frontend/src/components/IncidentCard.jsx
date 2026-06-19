import { ChevronRight, Loader2, MapPin, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatusBadge from '@/components/StatusBadge'
import IncidentPhotoUpload from '@/components/IncidentPhotoUpload'
import { INCIDENT_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function IncidentCard({
  incident,
  showUploadPrompt = false,
  showAnalyzing = false,
  onUploadSuccess,
}) {
  const typeLabel =
    INCIDENT_TYPE_LABELS[incident.incident_type] ?? incident.incident_type

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-violet-500/25 hover:shadow-[0_12px_40px_-12px_rgba(99,68,245,0.3)]',
        showAnalyzing && 'border-orange-500/25',
        showUploadPrompt && 'border-amber-500/25',
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-violet-500/60 via-cyan-500/40 to-transparent" />

      <Link to={`/incidents/${incident.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <p className="truncate text-lg font-semibold tracking-tight transition-colors group-hover:text-violet-300">
                {incident.case_number ?? incident.id}
              </p>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
            <p className="text-sm text-muted-foreground">{typeLabel}</p>
            {incident.caller_name && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{incident.caller_name}</span>
              </p>
            )}
          </div>
          <StatusBadge status={incident.status} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-md border border-white/8 bg-white/5 px-2 py-1">
            {formatTime(incident.created_at)}
          </span>
          {incident.location && (
            <span className="flex items-center gap-1 rounded-md border border-white/8 bg-white/5 px-2 py-1">
              <MapPin className="h-3 w-3 shrink-0 text-cyan-400" />
              <span className="truncate">{incident.location}</span>
            </span>
          )}
        </div>
      </Link>

      {showUploadPrompt && (
        <div className="border-t border-white/5 px-5 pb-5 pt-4">
          <IncidentPhotoUpload
            incidentId={incident.id}
            caseNumber={incident.case_number}
            onUploadSuccess={onUploadSuccess}
          />
        </div>
      )}

      {showAnalyzing && !showUploadPrompt && (
        <div className="flex items-center gap-2 border-t border-white/5 px-5 py-3.5 text-sm text-orange-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing evidence…
        </div>
      )}
    </div>
  )
}
