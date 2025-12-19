import { useMemo, useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type InvoiceSummaryFilterValues = {
  startDate?: string
  endDate?: string
}

type InvoiceSummaryFilterProps = {
  initialStartDate?: string
  initialEndDate?: string
  onApply?: (filters: InvoiceSummaryFilterValues) => void
  onReset?: () => void
}

const parseDate = (value?: string) => {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const toIsoDate = (value?: Date) =>
  value ? value.toISOString().slice(0, 10) : undefined

const getCurrentMonthRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { from: start, to: end }
}

export default function InvoiceSummaryFilter({
  initialStartDate,
  initialEndDate,
  onApply,
  onReset,
}: InvoiceSummaryFilterProps) {
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const from = parseDate(initialStartDate)
    const to = parseDate(initialEndDate)
    return from || to ? { from, to } : getCurrentMonthRange()
  })

  const hasChanges = useMemo(() => {
    const initialRange: DateRange | undefined = initialStartDate || initialEndDate
      ? { from: parseDate(initialStartDate), to: parseDate(initialEndDate) }
      : getCurrentMonthRange()
    return (
      toIsoDate(range?.from) !== toIsoDate(initialRange?.from) ||
      toIsoDate(range?.to) !== toIsoDate(initialRange?.to)
    )
  }, [range?.from, range?.to, initialStartDate, initialEndDate])

  const handleApply = () => {
    onApply?.({
      startDate: toIsoDate(range?.from),
      endDate: toIsoDate(range?.to),
    })
  }

  const handleReset = () => {
    setRange({
      from: parseDate(initialStartDate),
      to: parseDate(initialEndDate),
    })
    onReset?.()
    onApply?.({
      startDate: initialStartDate,
      endDate: initialEndDate,
    })
  }

  return (
    <div className='mb-4 flex flex-wrap items-end gap-3'>
      <div className='flex min-w-[260px] flex-col gap-2'>
        <Label className='text-xs font-semibold text-slate-600 uppercase dark:text-slate-300'>
          Date Range
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              className='w-[260px] justify-start text-left font-normal'
            >
              <CalendarIcon className='mr-2 h-4 w-4 opacity-70' />
              {range?.from ? (
                range.to ? (
                  <>
                    {range.from.toLocaleDateString()} -{' '}
                    {range.to.toLocaleDateString()}
                  </>
                ) : (
                  range.from.toLocaleDateString()
                )
              ) : (
                <span className='text-muted-foreground'>Select date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0' align='start'>
            <Calendar
              mode='range'
              captionLayout='dropdown'
              selected={range}
              onSelect={setRange}
              numberOfMonths={2}
              disabled={(date: Date) =>
                date > new Date() || date < new Date('1900-01-01')
              }
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className='flex items-center gap-2'>
        <Button onClick={handleApply}>Apply Filter</Button>
        <Button variant='outline' onClick={handleReset} disabled={!hasChanges}>
          Reset
        </Button>
      </div>
    </div>
  )
}

export type { InvoiceSummaryFilterValues }
