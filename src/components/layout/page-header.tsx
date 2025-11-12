import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn('mb-2 items-center justify-between space-y-2', className)}
    >
      <h1 className='text-2xl font-bold tracking-tight'>{title}</h1>
      {description ? (
        <p className='text-muted-foreground text-sm'>{description}</p>
      ) : (
        (actions ?? null)
      )}
    </div>
  )
}
