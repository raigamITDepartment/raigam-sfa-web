import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type CountBadgeProps = {
  value: ReactNode
  className?: string
  title?: string
}

export function CountBadge({ value, className, title }: CountBadgeProps) {
  return (
    <span
      className={cn(
        'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200',
        className
      )}
      title={title}
    >
      {value}
    </span>
  )
}
