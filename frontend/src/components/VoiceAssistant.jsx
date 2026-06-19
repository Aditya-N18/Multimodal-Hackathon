import { motion } from 'framer-motion'
import { AudioLines, Mic, Phone, PhoneOff, Sparkles } from 'lucide-react'
import { MovingBorder } from '@/components/aceternity/moving-border'
import VoiceBlob from '@/components/VoiceBlob'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { useVapiCall } from '@/hooks/useVapiCall'
import { isVapiConfigured } from '@/lib/vapi'
import { cn } from '@/lib/utils'

const STATUS_LABEL = {
  idle: 'Ready to connect',
  connecting: 'Connecting…',
  active: 'Call active',
  ended: 'Call ended',
  error: 'Error',
}

function LevelBar({ level, variant = 'emerald' }) {
  const color = variant === 'blue' ? 'bg-cyan-400' : 'bg-emerald-400'
  return (
    <div className="h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
      <motion.div
        className={cn('h-full rounded-full', color)}
        animate={{ width: `${Math.min(100, Math.round(level * 100))}%` }}
        transition={{ duration: 0.08 }}
      />
    </div>
  )
}

export default function VoiceAssistant() {
  const {
    status,
    messages,
    error,
    isAgentSpeaking,
    isUserSpeaking,
    micLevel,
    micTestLevel,
    isMicTesting,
    micTestStatus,
    micTestMessage,
    isConfigured,
    isLoadingSdk,
    isActive,
    isCallLive,
    startCall,
    stopCall,
    reset,
    testMicrophone,
  } = useVapiCall()

  const hasUserTranscript = messages.some((m) => m.role === 'user')
  const audioLevel = isMicTesting ? micTestLevel : micLevel

  const callHint = isAgentSpeaking
    ? 'Agent speaking…'
    : isUserSpeaking
      ? "You're speaking — mic is live"
      : 'Listening — your mic is on, speak now'

  return (
    <div className="space-y-6">
      {!isVapiConfigured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Add <code className="rounded bg-amber-500/20 px-1">VITE_VAPI_PUBLIC_KEY</code> and{' '}
          <code className="rounded bg-amber-500/20 px-1">VITE_VAPI_ASSISTANT_ID</code> to{' '}
          <code className="rounded bg-amber-500/20 px-1">.env</code>
        </div>
      )}

      <GlassCard glow className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-cyan-500/10" />

        <div className="relative flex flex-col items-center gap-6 py-6">
          {isCallLive && (
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live — call stays active until you end it
            </div>
          )}

          <VoiceBlob
            status={status}
            isActive={isActive}
            isMicTesting={isMicTesting}
            isAgentSpeaking={isAgentSpeaking}
            level={audioLevel}
            className="h-72 w-72"
          />

          <div className="text-center">
            <p className="text-lg font-semibold">
              {isLoadingSdk
                ? 'Loading voice SDK…'
                : isMicTesting
                  ? 'Mic test active'
                  : STATUS_LABEL[status]}
            </p>
            {isMicTesting && (
              <p className="mt-1 text-xs text-muted-foreground">
                Speak now — browser mic stays on until you stop the test.
              </p>
            )}
            {isActive && !isMicTesting && (
              <p className="mt-1 text-xs text-muted-foreground">{callHint}</p>
            )}
          </div>

          {(isMicTesting || (isActive && !isMicTesting)) && (
            <LevelBar
              level={audioLevel}
              variant={isAgentSpeaking && !isMicTesting ? 'blue' : 'emerald'}
            />
          )}

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            {!isActive && status !== 'ended' && (
              <>
                <Button
                  variant={isMicTesting ? 'secondary' : 'outline'}
                  onClick={testMicrophone}
                  disabled={!isConfigured}
                  className="rounded-full border-white/10 bg-white/5"
                >
                  <Mic className="mr-2 h-4 w-4" />
                  {isMicTesting ? 'Stop mic test' : 'Test mic'}
                </Button>
                {isConfigured ? (
                  <MovingBorder
                    duration={4000}
                    containerClassName="rounded-full"
                    className="rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 px-6 py-2.5 font-medium"
                    onClick={startCall}
                  >
                    <Phone className="mr-2 inline h-4 w-4" />
                    Start call
                  </MovingBorder>
                ) : (
                  <Button disabled className="rounded-full">
                    <Phone className="mr-2 h-4 w-4" />
                    Start call
                  </Button>
                )}
              </>
            )}
            {isActive && (
              <Button
                variant="destructive"
                onClick={stopCall}
                className="rounded-full px-6"
              >
                <PhoneOff className="mr-2 h-4 w-4" />
                End call
              </Button>
            )}
            {status === 'ended' && (
              <Button variant="outline" onClick={reset} className="rounded-full border-white/10">
                <Sparkles className="mr-2 h-4 w-4" />
                New call
              </Button>
            )}
          </div>

          {micTestMessage && !isActive && (
            <p
              className={cn(
                'text-xs',
                micTestStatus === 'ok' && 'text-emerald-400',
                micTestStatus === 'denied' && 'text-red-400',
                micTestStatus === 'error' && 'text-red-400',
              )}
            >
              {micTestMessage}
            </p>
          )}

          {isActive && hasUserTranscript && (
            <p className="text-xs text-emerald-400">
              Mic working — your speech appears in the transcript below.
            </p>
          )}
        </div>
      </GlassCard>

      {messages.length > 0 && (
        <GlassCard className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <AudioLines className="h-4 w-4 text-violet-400" />
            Live transcript
          </h2>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'rounded-xl px-4 py-2.5 text-sm',
                  msg.role === 'user' && 'border border-white/5 bg-white/5',
                  msg.role === 'assistant' && 'border border-violet-500/20 bg-violet-500/10',
                  msg.role === 'system' &&
                    'border border-amber-500/20 bg-amber-500/10 font-mono text-xs text-amber-200',
                )}
              >
                <span className="font-medium text-foreground/80">{msg.label}: </span>
                {msg.text}
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
