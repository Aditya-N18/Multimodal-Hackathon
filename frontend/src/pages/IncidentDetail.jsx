import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  Calendar,
  FileText,
  ImageIcon,
  MapPin,
  Phone,
  Shield,
  Sparkles,
  User,
} from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  EvidencePhoto,
  ReportCard,
  StatTile,
} from '@/components/ui/glass-card'
import { INCIDENT_TYPE_LABELS, SEVERITY_STYLES } from '@/lib/constants'
import { useIncident } from '@/hooks/useIncident'
import { cn } from '@/lib/utils'

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function IncidentDetail() {
  const { id } = useParams()
  const { incident, loading, error } = useIncident(id)

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-20 text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-400" />
        Loading case report…
      </div>
    )
  }

  if (error || !incident) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="rounded-full">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to list
          </Link>
        </Button>
        <ReportCard title="Error" accent="rose">
          <p className="text-sm text-red-300">{error ?? 'Incident not found'}</p>
        </ReportCard>
      </div>
    )
  }

  const typeLabel =
    INCIDENT_TYPE_LABELS[incident.incident_type] ?? incident.incident_type
  const images = incident.image_urls ?? []
  const hazards = incident.hazard_evidence ?? []
  const missing = incident.missing_evidence ?? []
  const severityStyle =
    SEVERITY_STYLES[incident.severity] ?? 'text-muted-foreground bg-white/5 border-white/10'
  const isReportReady = incident.status === 'report_ready'

  return (
    <div className="space-y-6">
      {/* Hero report header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/20 via-white/[0.04] to-cyan-600/10 p-6 shadow-[0_16px_48px_-16px_rgba(99,68,245,0.4)] backdrop-blur-xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative space-y-5">
          <Button variant="ghost" size="sm" className="-ml-2 rounded-full" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              All incidents
            </Link>
          </Button>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-violet-300">
                <Shield className="h-3.5 w-3.5" />
                Incident report
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                <span className="text-gradient">
                  {incident.case_number ?? incident.id}
                </span>
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium text-foreground/90">
                  {typeLabel}
                </span>
                {incident.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                    {incident.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(incident.occurred_at ?? incident.created_at)}
                </span>
              </div>
            </div>
            <StatusBadge status={incident.status} className="px-3 py-1.5 text-sm" />
          </div>

          {isReportReady && (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Full report generated
            </div>
          )}
        </div>
      </div>

      {/* Key facts bento grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Caller" value={incident.caller_name ?? '—'} icon={User} accent="violet" />
        <StatTile label="Phone" value={incident.caller_phone ?? '—'} icon={Phone} accent="cyan" />
        <StatTile
          label="Occurred"
          value={formatTime(incident.occurred_at)}
          icon={Calendar}
          accent="emerald"
        />
        <StatTile
          label="Immediate danger"
          value={incident.immediate_danger ? 'Yes — flagged' : 'No'}
          icon={AlertTriangle}
          accent={incident.immediate_danger ? 'rose' : 'emerald'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {incident.other_party_info && (
          <ReportCard title="Other party" icon={User} accent="violet">
            <p className="text-sm leading-relaxed text-foreground/90">
              {incident.other_party_info}
            </p>
          </ReportCard>
        )}

        <ReportCard
          title="Call transcript"
          icon={FileText}
          accent="cyan"
          className={!incident.other_party_info ? 'lg:col-span-2' : ''}
        >
          <p className="rounded-xl border border-white/5 bg-black/20 p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground/85">
            {incident.raw_transcript ?? 'No transcript yet.'}
          </p>
        </ReportCard>
      </div>

      <ReportCard
        title="Evidence photos"
        icon={ImageIcon}
        accent="amber"
        badge={
          images.length > 0 ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-muted-foreground">
              {images.length} file{images.length !== 1 ? 's' : ''}
            </span>
          ) : null
        }
      >
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
            <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Awaiting photo upload</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Photos will appear here once submitted by the caller
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((url) => (
              <EvidencePhoto key={url} src={url} alt="Incident evidence" />
            ))}
          </div>
        )}
      </ReportCard>

      {(hazards.length > 0 || incident.severity) && (
        <ReportCard
          title="AI evidence analysis"
          icon={Brain}
          accent="violet"
          badge={
            incident.severity ? (
              <span
                className={cn(
                  'inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize',
                  severityStyle,
                )}
              >
                {incident.severity} severity
              </span>
            ) : null
          }
        >
          {hazards.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {hazards.map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/8 bg-gradient-to-br from-white/[0.06] to-transparent p-4 transition-colors hover:border-violet-500/20"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">
                    {(item.type ?? 'evidence').replace(/_/g, ' ')}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                    {item.detail ?? JSON.stringify(item)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hazard evidence detected.</p>
          )}
          {missing.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                Still missing
              </p>
              <p className="mt-1 text-sm text-amber-200/90">{missing.join(', ')}</p>
            </div>
          )}
        </ReportCard>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <ReportCard title="Responder summary" icon={Shield} accent="cyan">
          <p className="text-sm leading-relaxed text-foreground/90">
            {incident.responder_summary ??
              'Not generated yet — waiting for photo analysis.'}
          </p>
        </ReportCard>
        <ReportCard title="Insurance case file" icon={FileText} accent="emerald">
          <p className="text-sm leading-relaxed text-foreground/90">
            {incident.case_file_summary ??
              'Not generated yet — waiting for photo analysis.'}
          </p>
        </ReportCard>
      </div>
    </div>
  )
}
