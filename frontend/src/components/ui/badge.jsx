import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-white/10 bg-white/10 text-foreground',
        secondary: 'border-white/5 bg-white/5 text-muted-foreground',
        outline: 'border-white/15 text-foreground',
        glow: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
