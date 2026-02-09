import React, { type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

type PageHeaderProps = {
  title: ReactNode
  actions?: ReactNode
  className?: string
  breadcrumbs?: { label: ReactNode; to?: string; href?: string }[]
}

export function PageHeader({
  title,
  actions,
  className,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <div
      className={cn('mb-2 items-center justify-between space-y-2', className)}
    >
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <h1 className='text-xl font-bold tracking-tight sm:text-2xl'>
          {title}
        </h1>
        {actions ? <div>{actions}</div> : null}
      </div>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumb className='mb-1'>
          <BreadcrumbList>
            {breadcrumbs.map((bc, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <React.Fragment key={idx}>
                  <BreadcrumbItem key={`bc-item-${idx}`}>
                    {isLast ? (
                      <BreadcrumbPage>{bc.label}</BreadcrumbPage>
                    ) : bc.to ? (
                      <BreadcrumbLink asChild>
                        <Link to={bc.to}>{bc.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbLink href={bc.href}>{bc.label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator key={`bc-sep-${idx}`} />}
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}
    </div>
  )
}
