import React from 'react'
import { CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type AlertVariant = 'success' | 'error' | 'warning' | 'info'

interface CommonAlertProps {
  variant?: AlertVariant
  title: string
  description?: string
  className?: string
}

const variantConfig: Record<
  AlertVariant,
  {
    icon: React.ReactNode
    base: string
  }
> = {
  success: {
    icon: (
      <CheckCircle className='h-5 w-5 text-green-600 dark:text-green-400' />
    ),
    base:
      'border-green-300 bg-green-50 text-green-700 ' +
      'dark:border-green-700 dark:bg-green-900/40 dark:text-green-300',
  },
  error: {
    icon: <XCircle className='h-5 w-5 text-red-600 dark:text-red-400' />,
    base:
      'border-red-300 bg-red-50 text-red-700 ' +
      'dark:border-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
  warning: {
    icon: (
      <AlertTriangle className='h-5 w-5 text-yellow-600 dark:text-yellow-400' />
    ),
    base:
      'border-yellow-300 bg-yellow-50 text-yellow-700 ' +
      'dark:border-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  },
  info: {
    icon: <Info className='h-5 w-5 text-blue-600 dark:text-blue-400' />,
    base:
      'border-blue-300 bg-blue-50 text-blue-700 ' +
      'dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
}

export function CommonAlert({
  variant = 'info',
  title,
  description,
  className,
}: CommonAlertProps) {
  const cfg = variantConfig[variant]

  return (
    <Alert className={cn('flex items-start gap-3', cfg.base, className)}>
      {cfg.icon}
      <div>
        <AlertTitle className='font-semibold'>{title}</AlertTitle>
        {description && (
          <AlertDescription className='mt-1'>{description}</AlertDescription>
        )}
      </div>
    </Alert>
  )
}
