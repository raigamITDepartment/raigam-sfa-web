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
  storageKey?: string
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
  storageKey,
  className,
  listClassName,
  triggerClassName,
  contentClassName,
  ...rootProps
}: CommonTabsProps) {
  if (!items || items.length === 0) return null

  const fallbackValue = defaultValue ?? items[0]?.value
  const shouldPersist = Boolean(storageKey)

  const [internalValue, setInternalValue] = React.useState(() => {
    if (!shouldPersist || typeof window === 'undefined') return fallbackValue

    return (
      window.localStorage.getItem(storageKey!) ??
      fallbackValue
    )
  })

  const currentValue = value ?? internalValue

  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }

  React.useEffect(() => {
    if (!shouldPersist || typeof window === 'undefined') return
    if (currentValue == null) return

    window.localStorage.setItem(storageKey!, currentValue)
  }, [currentValue, shouldPersist, storageKey])

  return (
    <UITabs
      value={currentValue}
      defaultValue={fallbackValue}
      onValueChange={handleValueChange}
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
