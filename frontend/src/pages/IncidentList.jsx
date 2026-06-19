import { FileText, Radio } from 'lucide-react'
import ConnectionBanner from '@/components/ConnectionBanner'
import IncidentCard from '@/components/IncidentCard'
import { GlassCard } from '@/components/ui/glass-card'
import { useIncidents } from '@/hooks/useIncidents'

export default function IncidentList() {
  const {
    incidents,
    loading,
    error,
    uploadPromptIds,
    analyzingIds,
    handleUploadSuccess,
  } = useIncidents()

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-violet-400">
          <Radio className="h-3.5 w-3.5" />
          Operations dashboard
        </div>
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="text-gradient">EvidenceLine</span>
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Live incident cases — updates automatically when Vapi creates or
          analyzes a report.
        </p>
      </div>

      <ConnectionBanner />

      {loading && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-400" />
          Loading incidents…
        </div>
      )}

      {error && (
        <GlassCard className="border-red-500/30 text-sm text-red-300">
          Failed to load incidents: {error}
        </GlassCard>
      )}

      {!loading && !error && incidents.length === 0 && (
        <GlassCard className="flex flex-col items-center py-16 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium">No incidents yet</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Call the Vapi number or use the voice test tab to create the first case.
          </p>
        </GlassCard>
      )}

      <div className="grid gap-4">
        {incidents.map((incident) => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            showUploadPrompt={uploadPromptIds.has(incident.id)}
            showAnalyzing={
              analyzingIds.has(incident.id) || incident.status === 'analyzing'
            }
            onUploadSuccess={handleUploadSuccess}
          />
        ))}
      </div>
    </div>
  )
}
