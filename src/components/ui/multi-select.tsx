import { useMemo, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type MultiSelectOption = {
  value: string
  label: string
}

type MultiSelectProps = {
  options: MultiSelectOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  maxDisplayValues?: number
}

export function MultiSelect(props: MultiSelectProps) {
  const {
    options,
    value,
    onValueChange,
    placeholder = 'Select',
    disabled,
    className,
    maxDisplayValues = 2,
  } = props
  const [open, setOpen] = useState(false)

  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((option) => [option.value, option.label]))
    return value.map((val) => map.get(val)).filter(Boolean) as string[]
  }, [options, value])

  const toggleValue = (val: string) => {
    const exists = value.includes(val)
    if (exists) {
      onValueChange(value.filter((item) => item !== val))
    } else {
      onValueChange([...value, val])
    }
  }

  const clearValue = (val: string) => {
    onValueChange(value.filter((item) => item !== val))
  }

  const triggerLabel = (() => {
    if (!selectedLabels.length) return placeholder
    const [first, second] = selectedLabels
    if (selectedLabels.length === 1) return first
    if (selectedLabels.length === 2 || maxDisplayValues === 2) {
      return `${first}, ${second}`
    }
    const displayed = selectedLabels.slice(0, maxDisplayValues).join(', ')
    const remaining = selectedLabels.length - maxDisplayValues
    return remaining > 0 ? `${displayed}, +${remaining}` : displayed
  })()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className={cn(
            'justify-between overflow-hidden text-ellipsis',
            className
          )}
          disabled={disabled}
        >
          <span className='truncate'>{triggerLabel}</span>
          <ChevronDown className='ml-2 size-4 shrink-0 opacity-60' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[280px] p-0'>
        <Command>
          <CommandInput placeholder='Search...' />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = value.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => toggleValue(option.value)}
                  >
                    <Check
                      className={cn(
                        'mr-2 size-4',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className='flex-1 truncate'>{option.label}</span>
                    {isSelected ? (
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='size-6 text-muted-foreground'
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          clearValue(option.value)
                        }}
                      >
                        <X className='size-3.5' />
                      </Button>
                    ) : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
