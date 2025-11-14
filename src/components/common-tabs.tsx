import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Tabs as UITabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'

type RootProps = React.ComponentProps<typeof UITabs>

export type TabItem = {
  value: string
  label: React.ReactNode
  content: React.ReactNode
  disabled?: boolean
}

export interface CommonTabsProps
  extends Omit<
    RootProps,
    'children' | 'value' | 'defaultValue' | 'onValueChange'
  > {
  items: TabItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  className?: string
  listClassName?: string
  triggerClassName?: string
  contentClassName?: string
}

export function CommonTabs({
  items,
  value,
  defaultValue,
  onValueChange,
  className,
  listClassName,
  triggerClassName,
  contentClassName,
  ...rootProps
}: CommonTabsProps) {
  if (!items || items.length === 0) return null

  const initial = defaultValue ?? items[0]?.value

  return (
    <UITabs
      value={value}
      defaultValue={initial}
      onValueChange={onValueChange}
      className={cn(className)}
      {...rootProps}
    >
      <TabsList
        className={cn(
          // Ensure responsive behavior: scroll on small screens
          'items-start gap-2 overflow-x-auto md:overflow-visible',
          listClassName
        )}
      >
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={cn(
              // Prevent stretching so items size to content and can scroll
              'flex-none',
              triggerClassName
            )}
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent
          key={item.value}
          value={item.value}
          className={cn(contentClassName)}
        >
          {item.content}
        </TabsContent>
      ))}
    </UITabs>
  )
}

export default CommonTabs
