'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type ButtonVariant = React.ComponentProps<typeof Button>['variant']

type DialogAction = {
  label: React.ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  disabled?: boolean
  loading?: boolean
}

type CommonDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode

  /**
   * Primary action button (usually on the right).
   */
  primaryAction?: DialogAction

  /**
   * Secondary action button (usually on the left, e.g. Cancel).
   */
  secondaryAction?: DialogAction

  /**
   * Hide the X close icon in the top‑right.
   */
  hideCloseButton?: boolean

  /**
   * Hide the footer area entirely.
   */
  hideFooter?: boolean

  /**
   * Extra classes to customize layout.
   */
  contentClassName?: string
  headerClassName?: string
  bodyClassName?: string
  footerClassName?: string
}

export function CommonDialog(props: CommonDialogProps) {
  const {
    open,
    onOpenChange,
    title,
    description,
    children,
    primaryAction,
    secondaryAction,
    hideCloseButton,
    hideFooter,
    contentClassName,
    headerClassName,
    bodyClassName,
    footerClassName,
  } = props

  const showFooter = !hideFooter && (primaryAction || secondaryAction)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!hideCloseButton}
        className={contentClassName}
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        {(title || description) && (
          <DialogHeader className={headerClassName}>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}

        {children && (
          <div
            className={`max-h-[70vh] overflow-y-auto px-4 pb-4 ${bodyClassName ?? ''}`.trim()}
          >
            {children}
          </div>
        )}

        {showFooter && (
          <DialogFooter className={footerClassName}>
            {secondaryAction && (
              <Button
                type='button'
                variant={secondaryAction.variant ?? 'outline'}
                disabled={secondaryAction.disabled || secondaryAction.loading}
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.loading ? 'Please wait...' : secondaryAction.label}
              </Button>
            )}
            {primaryAction && (
              <Button
                type='button'
                variant={primaryAction.variant ?? 'default'}
                disabled={primaryAction.disabled || primaryAction.loading}
                onClick={primaryAction.onClick}
              >
                {primaryAction.loading ? 'Please wait...' : primaryAction.label}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

