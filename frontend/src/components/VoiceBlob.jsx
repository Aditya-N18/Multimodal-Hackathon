import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const BLOB_MORPH = [
  '60% 40% 30% 70% / 60% 30% 70% 40%',
  '30% 60% 70% 40% / 50% 60% 30% 60%',
  '50% 60% 30% 60% / 30% 60% 70% 40%',
  '60% 40% 30% 70% / 60% 30% 70% 40%',
]

const STATE_CONFIG = {
  idle: {
    label: 'Standby',
    gradient: 'from-violet-600/80 via-fuchsia-500/70 to-indigo-600/80',
    glow: 'rgba(139,92,246,0.45)',
    ring: 'border-violet-500/20',
    pulseSpeed: 4,
    breathe: 0.04,
  },
  connecting: {
    label: 'Connecting',
    gradient: 'from-violet-500/90 via-cyan-500/70 to-violet-600/90',
    glow: 'rgba(99,102,241,0.5)',
    ring: 'border-cyan-500/30',
    pulseSpeed: 1.5,
    breathe: 0.08,
  },
  listening: {
    label: 'Listening',
    gradient: 'from-emerald-400/90 via-cyan-400/80 to-teal-500/90',
    glow: 'rgba(52,211,153,0.5)',
    ring: 'border-emerald-500/35',
    pulseSpeed: 2.5,
    breathe: 0.12,
  },
  speaking: {
    label: 'Speaking',
    gradient: 'from-cyan-400/90 via-blue-500/80 to-violet-500/90',
    glow: 'rgba(34,211,238,0.55)',
    ring: 'border-cyan-400/40',
    pulseSpeed: 1.8,
    breathe: 0.14,
  },
  micTest: {
    label: 'Mic test',
    gradient: 'from-emerald-400/90 via-green-400/75 to-cyan-500/85',
    glow: 'rgba(74,222,128,0.5)',
    ring: 'border-emerald-400/35',
    pulseSpeed: 2,
    breathe: 0.12,
  },
  ended: {
    label: 'Ended',
    gradient: 'from-slate-500/60 via-violet-500/40 to-slate-600/60',
    glow: 'rgba(100,116,139,0.3)',
    ring: 'border-white/10',
    pulseSpeed: 5,
    breathe: 0.02,
  },
  error: {
    label: 'Error',
    gradient: 'from-red-500/70 via-rose-500/60 to-red-600/70',
    glow: 'rgba(239,68,68,0.4)',
    ring: 'border-red-500/30',
    pulseSpeed: 3,
    breathe: 0.03,
  },
}

function resolveBlobState({ status, isActive, isMicTesting, isAgentSpeaking }) {
  if (isMicTesting) return 'micTest'
  if (status === 'error') return 'error'
  if (status === 'ended') return 'ended'
  if (status === 'connecting') return 'connecting'
  if (isActive && isAgentSpeaking) return 'speaking'
  if (isActive) return 'listening'
  return 'idle'
}

export default function VoiceBlob({
  status,
  isActive,
  isMicTesting,
  isAgentSpeaking,
  level = 0,
  className,
}) {
  const blobState = resolveBlobState({ status, isActive, isMicTesting, isAgentSpeaking })
  const config = STATE_CONFIG[blobState]
  const isLive = blobState === 'listening' || blobState === 'speaking' || blobState === 'micTest'
  const audioBoost = 1 + Math.min(level, 1) * config.breathe * 3
  const ringScale = 1.15 + Math.min(level, 1) * 0.35

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Outer pulse rings */}
      {isLive && (
        <>
          <motion.div
            className="absolute h-56 w-56 rounded-full border"
            style={{ borderColor: config.glow }}
            animate={{
              scale: [1, ringScale, 1],
              opacity: [0.35, 0.08, 0.35],
            }}
            transition={{ duration: config.pulseSpeed, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute h-64 w-64 rounded-full border border-white/5"
            animate={{
              scale: [1, 1.25 + level * 0.2, 1],
              opacity: [0.2, 0.05, 0.2],
            }}
            transition={{
              duration: config.pulseSpeed * 1.3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.4,
            }}
          />
        </>
      )}

      {/* Soft ambient glow */}
      <motion.div
        className="absolute h-44 w-44 rounded-full blur-3xl"
        style={{ backgroundColor: config.glow }}
        animate={{
          scale: isLive ? [1, 1.15 + level * 0.2, 1] : [1, 1.06, 1],
          opacity: isLive ? [0.5, 0.75, 0.5] : [0.35, 0.5, 0.35],
        }}
        transition={{ duration: config.pulseSpeed, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Main morphing blob */}
      <motion.div
        className={cn(
          'relative h-40 w-40 bg-gradient-to-br shadow-2xl',
          config.gradient,
          config.ring,
        )}
        style={{
          boxShadow: `0 0 60px -10px ${config.glow}, inset 0 0 40px -10px rgba(255,255,255,0.15)`,
        }}
        animate={{
          borderRadius: BLOB_MORPH,
          scale: isLive ? [audioBoost * 0.97, audioBoost, audioBoost * 0.97] : [1, 1.04, 1],
          rotate: isLive ? [0, 3, -3, 0] : [0, 1.5, -1.5, 0],
        }}
        transition={{
          borderRadius: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: isLive ? 0.6 : config.pulseSpeed, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: 8, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        {/* Inner liquid highlight */}
        <motion.div
          className="absolute inset-3 bg-gradient-to-tr from-white/30 via-white/10 to-transparent"
          animate={{ borderRadius: BLOB_MORPH, opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Core shimmer */}
        <motion.div
          className="absolute left-1/4 top-1/4 h-10 w-10 rounded-full bg-white/40 blur-md"
          animate={{
            x: [0, 12, -8, 0],
            y: [0, -10, 6, 0],
            scale: [1, 1.2, 0.9, 1],
            opacity: [0.5, 0.8, 0.4, 0.5],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* State label under blob */}
      <motion.span
        className="absolute -bottom-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 backdrop-blur-md"
        key={blobState}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {config.label}
      </motion.span>
    </div>
  )
}
