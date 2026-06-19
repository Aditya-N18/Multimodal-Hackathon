import { motion, useAnimationFrame, useMotionTemplate, useMotionValue, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { cn } from '@/lib/utils'

export function MovingBorder({
  children,
  duration = 3000,
  className,
  containerClassName,
  borderClassName,
  as: Component = 'button',
  ...props
}) {
  const pathRef = useRef(null)
  const progress = useMotionValue(0)

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength()
    if (length) {
      const pxPerMillisecond = length / duration
      progress.set((time * pxPerMillisecond) % length)
    }
  })

  const x = useTransform(progress, (val) => {
    const point = pathRef.current?.getPointAtLength(val)
    return point?.x ?? 0
  })

  const y = useTransform(progress, (val) => {
    const point = pathRef.current?.getPointAtLength(val)
    return point?.y ?? 0
  })

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`

  return (
    <Component
      className={cn(
        'relative overflow-hidden bg-transparent p-[1px] text-sm',
        containerClassName,
      )}
      {...props}
    >
      <div className="absolute inset-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="absolute h-full w-full"
          width="100%"
          height="100%"
        >
          <rect fill="none" width="100%" height="100%" rx="30%" ry="30%" ref={pathRef} />
        </svg>
        <motion.div
          style={{ transform }}
          className={cn(
            'absolute inline-flex h-4 w-4 rounded-full bg-cyan-400 blur-[2px]',
            borderClassName,
          )}
        />
      </div>
      <div
        className={cn(
          'relative z-10 flex h-full w-full items-center justify-center rounded-[inherit] bg-slate-950/90 px-4 py-2 text-white backdrop-blur-xl',
          className,
        )}
      >
        {children}
      </div>
    </Component>
  )
}
