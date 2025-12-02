import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface FullWidthDialogProps {
  /** Button or custom element that triggers the dialog */
  trigger?: React.ReactNode
  /** Title text of the dialog */
  title?: string
  /** Optional description below the title */
  description?: string
  /** Dialog inner content (e.g., invoice preview, form, etc.) */
  children: React.ReactNode
  /** Optional width control (default = full-screen) */
  width?: "full" | "wide" | "medium"
  /** Open/close state if controlled externally */
  open?: boolean
  /** Callback when open/close state changes */
  onOpenChange?: (open: boolean) => void
}

/**
 * Common reusable full-width Shadcn Dialog component.
 * Supports 3 widths (full, wide, medium).
 * Works with both controlled and uncontrolled open states.
 */
export function FullWidthDialog({
  trigger,
  title,
  description,
  children,
  width = "full",
  open,
  onOpenChange,
}: FullWidthDialogProps) {
  const widthClass =
    width === "full"
      ? "left-0 top-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none sm:max-w-none rounded-none p-0"
      : width === "wide"
        ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[90vw] max-h-[90vh] p-4"
        : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] max-h-[85vh] p-4"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={`fixed flex flex-col gap-1 overflow-hidden ${widthClass}`}
      >
        {(title || description) && (
          <DialogHeader className="gap-1 border-b px-6 py-4 bg-gray-100 text-left">
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {!description && (
          <DialogDescription className="sr-only">
            Dialog content
          </DialogDescription>
        )}
        <div className="flex-1 overflow-auto p-6 bg-white">{children}</div>
      </DialogContent>
    </Dialog>
  )
}

export default FullWidthDialog
