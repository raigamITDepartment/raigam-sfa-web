import { useMemo, useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import type { InvoiceTypeParam, ReportInvoiceTypeParam } from '@/types/invoice'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
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

type InvoiceSummaryFilterValues = {
  startDate?: string
  endDate?: string
  invoiceType?: ReportInvoiceTypeParam
}

type InvoiceSummaryFilterProps = {
  initialStartDate?: string
  initialEndDate?: string
  initialInvoiceType?: InvoiceTypeParam
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

const invoiceTypeOptions: Array<{
  label: string
  value: InvoiceTypeParam
}> = [
  { label: 'All', value: 'ALL' },
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Agency', value: 'AGENCY' },
  { label: 'Company', value: 'COMPANY' },
]

const toInvoiceTypeParam = (value: InvoiceTypeParam) =>
  value && value !== 'ALL' ? (value as ReportInvoiceTypeParam) : ''

export default function InvoiceSummaryFilter({
  initialStartDate,
  initialEndDate,
  initialInvoiceType = 'ALL',
  onApply,
  onReset,
}: InvoiceSummaryFilterProps) {
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const from = parseDate(initialStartDate)
    const to = parseDate(initialEndDate)
    return from || to ? { from, to } : getCurrentMonthRange()
  })
  const [invoiceType, setInvoiceType] =
    useState<InvoiceTypeParam>(initialInvoiceType)

  const hasChanges = useMemo(() => {
    const initialRange: DateRange | undefined = initialStartDate || initialEndDate
      ? { from: parseDate(initialStartDate), to: parseDate(initialEndDate) }
      : getCurrentMonthRange()
    return (
      toIsoDate(range?.from) !== toIsoDate(initialRange?.from) ||
      toIsoDate(range?.to) !== toIsoDate(initialRange?.to) ||
      invoiceType !== initialInvoiceType
    )
  }, [
    range?.from,
    range?.to,
    invoiceType,
    initialStartDate,
    initialEndDate,
    initialInvoiceType,
  ])

  const handleApply = () => {
    onApply?.({
      startDate: toIsoDate(range?.from),
      endDate: toIsoDate(range?.to),
      invoiceType: toInvoiceTypeParam(invoiceType),
    })
  }

  const handleReset = () => {
    setRange({
      from: parseDate(initialStartDate),
      to: parseDate(initialEndDate),
    })
    setInvoiceType(initialInvoiceType)
    onReset?.()
    onApply?.({
      startDate: initialStartDate,
      endDate: initialEndDate,
      invoiceType: toInvoiceTypeParam(initialInvoiceType),
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
          onValueChange={(value) => setInvoiceType(value as InvoiceTypeParam)}
        >
          <SelectTrigger className='w-[200px]'>
            <SelectValue placeholder='Select type' />
          </SelectTrigger>
          <SelectContent>
            {invoiceTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
