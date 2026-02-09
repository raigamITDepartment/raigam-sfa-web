declare module 'react-big-calendar' {
  import * as React from 'react'

  export type View = string
  export type NavigateAction = string

  export type ToolbarProps = {
    label?: string
    view?: View
    onView?: (view: View) => void
    onNavigate?: (action: NavigateAction, newDate?: Date) => void
  }

  export type SlotInfo = {
    start: Date
    end: Date
    slots: Date[]
    action: string
  }

  export const Calendar: React.ComponentType<any>
  export function dateFnsLocalizer(args: Record<string, any>): any
}
