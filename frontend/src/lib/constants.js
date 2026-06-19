export const INCIDENT_STATUSES = {
  new: 'New',
  awaiting_photos: 'Awaiting Photos',
  analyzing: 'Analyzing',
  report_ready: 'Report Ready',
}

export const STATUS_STYLES = {
  new: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  awaiting_photos: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  analyzing: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  report_ready: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
}

export const INCIDENT_TYPE_LABELS = {
  car_accident: 'Car Accident',
  slip_fall: 'Slip & Fall',
  workplace: 'Workplace',
  property_damage: 'Property Damage',
  other: 'Other',
}

export const SEVERITY_STYLES = {
  low: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
  medium: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
  high: 'text-red-300 bg-red-500/15 border-red-500/30',
}

export const REALTIME_CHANNEL =
  import.meta.env.VITE_REALTIME_CHANNEL || 'incidents'

export const REALTIME_EVENT =
  import.meta.env.VITE_REALTIME_EVENT || 'incident_updated'
