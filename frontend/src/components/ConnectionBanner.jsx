import { Activity, Wifi, WifiOff } from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-card'
import { isInsforgeConfigured } from '@/lib/insforge'

export default function ConnectionBanner() {
  if (isInsforgeConfigured) {
    return (
      <GlassPanel className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
          <Wifi className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-emerald-300">Live data connected</p>
          <p className="text-xs text-muted-foreground">
            Streaming from InsForge{' '}
            <code className="rounded bg-white/5 px-1 text-emerald-400/80">incidents</code>{' '}
            table with realtime + polling fallback
          </p>
        </div>
        <Activity className="ml-auto h-4 w-4 animate-pulse text-emerald-400" />
      </GlassPanel>
    )
  }

  return (
    <GlassPanel className="flex items-center gap-3 border-amber-500/20 px-4 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
        <WifiOff className="h-4 w-4 text-amber-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-amber-300">Demo mode</p>
        <p className="text-xs text-muted-foreground">
          Copy <code className="rounded bg-white/5 px-1">.env.example</code> to{' '}
          <code className="rounded bg-white/5 px-1">.env</code> with InsForge credentials for live cases.
        </p>
      </div>
    </GlassPanel>
  )
}
