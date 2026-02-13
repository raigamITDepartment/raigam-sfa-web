import { useEffect, useMemo, useState } from 'react'
import type { BookingInvoiceFilters, InvoiceType } from '@/types/invoice'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { parseLocalDate, toLocalDateString } from '@/lib/local-date'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type FilterProps = {
  initialStartDate?: string
  initialEndDate?: string
  initialInvoiceType?: InvoiceType
  initialTerritoryId?: number
  territoryOptions?: Array<{ label: string; value: number }>
  onApply?: (filters: BookingInvoiceFilters) => void
  onReset?: () => void
}

const invoiceTypeOptions: InvoiceType[] = ['ALL', 'NORMAL', 'AGENCY', 'COMPANY']

export default function BookingInvoiceFilter({
  initialStartDate,
  initialEndDate,
  initialInvoiceType = 'ALL',
  initialTerritoryId,
  territoryOptions,
  onApply,
  onReset,
}: FilterProps) {
  const [range, setRange] = useState<DateRange | undefined>({
    from: parseLocalDate(initialStartDate),
    to: parseLocalDate(initialEndDate),
  })
  const [invoiceType, setInvoiceType] =
    useState<InvoiceType>(initialInvoiceType)
  const [territoryId, setTerritoryId] = useState<number | undefined>(
    initialTerritoryId
  )

  useEffect(() => {
    setTerritoryId(initialTerritoryId)
  }, [initialTerritoryId])

  const hasChanges = useMemo(() => {
    const initialRange: DateRange | undefined =
      initialStartDate || initialEndDate
        ? {
            from: parseLocalDate(initialStartDate),
            to: parseLocalDate(initialEndDate),
          }
        : undefined
    return (
      toLocalDateString(range?.from) !==
        toLocalDateString(initialRange?.from) ||
      toLocalDateString(range?.to) !== toLocalDateString(initialRange?.to) ||
      invoiceType !== initialInvoiceType ||
      territoryId !== initialTerritoryId
    )
  }, [
    range?.from,
    range?.to,
    invoiceType,
    initialStartDate,
    initialEndDate,
    initialInvoiceType,
    territoryId,
    initialTerritoryId,
  ])

  const handleApply = () => {
    onApply?.({
      startDate: toLocalDateString(range?.from),
      endDate: toLocalDateString(range?.to),
      invoiceType,
      territoryId,
    })
  }

  const handleReset = () => {
    setRange(undefined)
    setInvoiceType('ALL')
    setTerritoryId(undefined)
    onReset?.()
    onApply?.({
      startDate: undefined,
      endDate: undefined,
      invoiceType: 'ALL',
      territoryId: undefined,
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
      <div className='flex min-w-[180px] flex-col gap-2'>
        <Label className='text-xs font-semibold text-slate-600 uppercase dark:text-slate-300'>
          Invoice Type
        </Label>
        <Select
          value={invoiceType}
          onValueChange={(v) => setInvoiceType(v as InvoiceType)}
        >
          <SelectTrigger className='w-[200px]'>
            <SelectValue placeholder='Select type' />
          </SelectTrigger>
          <SelectContent>
            {invoiceTypeOptions.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {territoryOptions?.length ? (
        <div className='flex min-w-[220px] flex-col gap-2'>
          <Label className='text-xs font-semibold text-slate-600 uppercase dark:text-slate-300'>
            Territory
          </Label>
          <Select
            value={territoryId ? String(territoryId) : ''}
            onValueChange={(value) => {
              const parsed = Number(value)
              setTerritoryId(Number.isNaN(parsed) ? undefined : parsed)
            }}
          >
            <SelectTrigger className='w-[240px]'>
              <SelectValue placeholder='Select territory' />
            </SelectTrigger>
            <SelectContent>
              {territoryOptions.map((territory) => (
                <SelectItem
                  key={territory.value}
                  value={String(territory.value)}
                >
                  {territory.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className='flex items-center gap-2'>
        <Button onClick={handleApply}>Apply Filters</Button>
        <Button variant='outline' onClick={handleReset} disabled={!hasChanges}>
          Reset
        </Button>
      </div>
    </div>
  )
}

export type { BookingInvoiceFilters } from '@/types/invoice'
