import { cn } from '@/lib/utils'
import { INCIDENT_STATUSES, STATUS_STYLES } from '@/lib/constants'

export default function StatusBadge({ status, className }) {
  const label = INCIDENT_STATUSES[status] ?? status
  const style = STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground border-border'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        style,
        className,
      )}
    >
      {label}
    </span>
  )
}
