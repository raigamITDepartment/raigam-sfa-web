import * as React from 'react'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

function Breadcrumb({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav aria-label='breadcrumb' className={cn('w-full', className)} {...props} />
  )
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  return (
    <ol
      className={cn(
        'flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground sm:text-sm',
        className
      )}
      {...props}
    />
  )
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li className={cn('inline-flex items-center gap-1.5', className)} {...props} />
  )
}

type BreadcrumbLinkProps = React.ComponentProps<'a'> & { asChild?: boolean }
function BreadcrumbLink({ asChild, className, ...props }: BreadcrumbLinkProps) {
  const Comp = asChild ? Slot : 'a'
  return (
    <Comp
      className={cn('transition-colors hover:text-foreground', className)}
      {...props}
    />
  )
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-current='page'
      className={cn('font-medium text-foreground', className)}
      {...props}
    />
  )
}

function BreadcrumbSeparator({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      role='presentation'
      aria-hidden='true'
      className={cn('mx-1 flex items-center', className)}
      {...props}
    >
      <ChevronRight className='size-4 text-muted-foreground' />
    </li>
  )
}

function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span className={cn('flex size-4 items-center justify-center', className)} {...props}>
      <MoreHorizontal className='size-4' />
      <span className='sr-only'>More</span>
    </span>
  )
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}

