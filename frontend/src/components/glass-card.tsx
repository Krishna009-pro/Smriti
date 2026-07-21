import { type HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hoverLift?: boolean
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, hoverLift = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'glass rounded-2xl border border-border',
        hoverLift &&
          'transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        className,
      )}
      {...props}
    />
  ),
)
GlassCard.displayName = 'GlassCard'
