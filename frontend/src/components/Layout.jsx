import { Link, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, Phone, PhoneOff, Radio, Shield } from 'lucide-react'
import { BackgroundBeams } from '@/components/aceternity/background-beams'
import { Spotlight } from '@/components/aceternity/spotlight'
import { Button } from '@/components/ui/button'
import { useVapiCall } from '@/hooks/useVapiCall'
import { cn } from '@/lib/utils'

function NavLink({ to, icon: Icon, label, active, live }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      className={cn(
        'relative gap-2 rounded-full border border-transparent px-4 transition-all',
        active && 'border-white/10 bg-white/10 text-foreground',
        live && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      )}
    >
      <Link to={to}>
        <Icon className="h-4 w-4" />
        {label}
        {live && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        )}
      </Link>
    </Button>
  )
}

function ActiveCallBar() {
  const { isCallLive, stopCall } = useVapiCall()
  const location = useLocation()

  if (!isCallLive || location.pathname === '/call') return null

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-emerald-500/30 bg-slate-950/90 px-5 py-2.5 shadow-[0_0_40px_-8px_rgba(16,185,129,0.4)] backdrop-blur-xl">
      <Radio className="h-4 w-4 animate-pulse text-emerald-400" />
      <span className="text-sm font-medium text-emerald-200">Voice call in progress</span>
      <Button variant="ghost" size="sm" asChild className="h-8 rounded-full text-xs">
        <Link to="/call">Return to call</Link>
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="h-8 rounded-full text-xs"
        onClick={stopCall}
      >
        <PhoneOff className="mr-1 h-3 w-3" />
        End
      </Button>
    </div>
  )
}

export default function Layout() {
  const location = useLocation()
  const { isCallLive } = useVapiCall()

  const isDashboard = location.pathname === '/'
  const isVoice = location.pathname === '/call'
  const voiceTabActive = isVoice || isCallLive

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Spotlight fill="#8b5cf6" />
      <BackgroundBeams className="opacity-40" />

      <header className="sticky top-0 z-40 border-b border-white/8 bg-slate-950/60 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="group flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-600/30 to-cyan-500/20 shadow-[0_0_24px_-6px_rgba(139,92,246,0.5)]">
              <Shield className="h-5 w-5 text-violet-300 transition-transform group-hover:scale-110" />
            </span>
            <div>
              <span className="text-lg font-bold tracking-tight text-gradient">
                EvidenceLine
              </span>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Voice-first incident docs
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <NavLink
              to="/"
              icon={LayoutDashboard}
              label="Dashboard"
              active={isDashboard}
            />
            <NavLink
              to="/call"
              icon={Phone}
              label="Voice test"
              active={voiceTabActive}
              live={isCallLive}
            />
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>

      <ActiveCallBar />
    </div>
  )
}
