import { cn } from '@/lib/utils'

export function GlassCard({ className, children, glow = false, ...props }) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur-xl',
        glow && 'shadow-[0_0_40px_-12px_rgba(99,68,245,0.35)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function GlassPanel({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/8 bg-white/[0.03] backdrop-blur-md',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const ACCENT_STYLES = {
  violet: 'from-violet-500/80 to-violet-500/0',
  cyan: 'from-cyan-500/80 to-cyan-500/0',
  amber: 'from-amber-500/80 to-amber-500/0',
  emerald: 'from-emerald-500/80 to-emerald-500/0',
  rose: 'from-rose-500/80 to-rose-500/0',
}

export function ReportCard({
  title,
  icon: Icon,
  accent = 'violet',
  badge,
  className,
  children,
  footer,
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 hover:border-white/15 hover:shadow-[0_12px_40px_-12px_rgba(99,68,245,0.25)]',
        className,
      )}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-px bg-gradient-to-r',
          ACCENT_STYLES[accent] ?? ACCENT_STYLES.violet,
        )}
      />
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/5 blur-2xl transition-opacity group-hover:opacity-100 opacity-0" />

      <div className="relative p-5 sm:p-6">
        {(title || Icon || badge) && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-inner">
                  <Icon className="h-4 w-4 text-violet-300" />
                </div>
              )}
              {title && (
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  {title}
                </h3>
              )}
            </div>
            {badge}
          </div>
        )}
        {children}
        {footer && (
          <div className="mt-4 border-t border-white/8 pt-4">{footer}</div>
        )}
      </div>
    </div>
  )
}

export function StatTile({ label, value, icon: Icon, accent = 'violet' }) {
  const iconColors = {
    violet: 'text-violet-400 bg-violet-500/15 border-violet-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/20',
    amber: 'text-amber-400 bg-amber-500/15 border-amber-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20',
    rose: 'text-rose-400 bg-rose-500/15 border-rose-500/20',
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl transition-all duration-300 hover:border-white/15 hover:bg-white/[0.06]">
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-px bg-gradient-to-r opacity-60',
          ACCENT_STYLES[accent] ?? ACCENT_STYLES.violet,
        )}
      />
      <div className="flex items-start gap-3">
        {Icon && (
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
              iconColors[accent] ?? iconColors.violet,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 truncate text-sm font-semibold leading-snug">{value}</p>
        </div>
      </div>
    </div>
  )
}

export function EvidencePhoto({ src, alt }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg">
      <img
        src={src}
        alt={alt}
        className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white/90 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
        Evidence photo
      </div>
    </div>
  )
}
