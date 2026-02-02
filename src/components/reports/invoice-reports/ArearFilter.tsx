import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import {
  getAllSubChannel,
  getAreasBySubChannelId,
  type ApiResponse,
  type AreaDTO,
  type SubChannelDTO,
} from '@/services/userDemarcationApi'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
import { useAppSelector } from '@/store/hooks'
import { cn } from '@/lib/utils'
import type { InvoiceTypeParam, ReportInvoiceTypeParam } from '@/types/invoice'

export type AreaInvoiceReportFilters = {
  subChannelId?: number
  areaId?: number
  invoiceType?: ReportInvoiceTypeParam
  startDate?: string
  endDate?: string
}

type AreaInvoiceReportFilterProps = {
  initialValues?: AreaInvoiceReportFilters
  onApply?: (filters: AreaInvoiceReportFilters) => void
  onReset?: () => void
}

const pad2 = (value: number) => String(value).padStart(2, '0')
const formatLocalDate = (value: Date) =>
  `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`
const toIsoDate = (value?: Date | null) =>
  value ? formatLocalDate(value) : undefined

const parseDate = (value?: string) => {
  if (!value) return undefined
  const plainMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const parsed = plainMatch ? new Date(`${value}T00:00:00`) : new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

const toNumberValue = (value: string) => {
  if (!value || value === '0') return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

const invoiceTypeOptions: Array<{
  label: string
  value: InvoiceTypeParam
}> = [
  { label: 'All Invoice Types', value: 'ALL' },
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Agency', value: 'AGENCY' },
  { label: 'Company', value: 'COMPANY' },
]

const toInvoiceTypeValue = (value?: ReportInvoiceTypeParam) =>
  value ? (value as InvoiceTypeParam) : 'ALL'

export default function AreaInvoiceReportFilter({
  initialValues,
  onApply,
  onReset,
}: AreaInvoiceReportFilterProps) {
  const controlHeight = 'h-9 min-h-[36px]'
  const todayIso = useMemo(() => formatLocalDate(new Date()), [])
  const user = useAppSelector((state) => state.auth.user)
  const canPickSubChannel = useMemo(() => {
    const userTypeId = user?.userTypeId
    return userTypeId === 1 || userTypeId === 2 || userTypeId === 3
  }, [user?.userTypeId])
  const lockedSubChannelId = useMemo(() => {
    if (canPickSubChannel) return ''
    const value = user?.subChannelId
    return value !== undefined && value !== null ? String(value) : ''
  }, [canPickSubChannel, user?.subChannelId])

  const [subChannelId, setSubChannelId] = useState<string>('')
  const [areaId, setAreaId] = useState<string>('')
  const [invoiceType, setInvoiceType] = useState<InvoiceTypeParam>('ALL')
  const [range, setRange] = useState<DateRange | undefined>({
    from: parseDate(initialValues?.startDate ?? todayIso),
    to: parseDate(initialValues?.endDate ?? todayIso),
  })
  const [errors, setErrors] = useState({
    subChannelId: false,
    areaId: false,
  })

  const effectiveSubChannelId = canPickSubChannel
    ? subChannelId
    : lockedSubChannelId

  useEffect(() => {
    if (!initialValues) {
      if (!canPickSubChannel) {
        setSubChannelId(lockedSubChannelId)
      }
      return
    }
    setSubChannelId(
      canPickSubChannel
        ? initialValues.subChannelId !== undefined &&
          initialValues.subChannelId !== null
          ? String(initialValues.subChannelId)
          : ''
        : lockedSubChannelId
    )
    setAreaId(
      initialValues.areaId !== undefined && initialValues.areaId !== null
        ? String(initialValues.areaId)
        : ''
    )
    setInvoiceType(toInvoiceTypeValue(initialValues.invoiceType))
    setRange({
      from: parseDate(initialValues.startDate ?? todayIso),
      to: parseDate(initialValues.endDate ?? todayIso),
    })
  }, [
    initialValues,
    todayIso,
    canPickSubChannel,
    lockedSubChannelId,
  ])

  useEffect(() => {
    if (canPickSubChannel) return
    if (!lockedSubChannelId) return
    if (subChannelId === lockedSubChannelId) return
    setSubChannelId(lockedSubChannelId)
    setAreaId('')
  }, [canPickSubChannel, lockedSubChannelId, subChannelId])

  const { data: subChannels = [], isLoading: loadingSubChannels } = useQuery({
    queryKey: ['reports', 'invoice-reports', 'area', 'sub-channels'],
    queryFn: async () => {
      const res = (await getAllSubChannel()) as ApiResponse<SubChannelDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: areas = [], isLoading: loadingAreas } = useQuery({
    queryKey: [
      'reports',
      'invoice-reports',
      'area',
      'areas',
      effectiveSubChannelId || 'none',
    ],
    enabled: Boolean(effectiveSubChannelId),
    queryFn: async () => {
      if (!effectiveSubChannelId) return []
      const res = (await getAreasBySubChannelId(
        Number(effectiveSubChannelId)
      )) as ApiResponse<AreaDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const handleApply = () => {
    const hasSubChannel = Boolean(effectiveSubChannelId)
    const hasArea = Boolean(areaId)
    const nextErrors = {
      subChannelId: !hasSubChannel,
      areaId: !hasArea,
    }
    setErrors(nextErrors)
    if (nextErrors.subChannelId || nextErrors.areaId) return

    onApply?.({
      subChannelId: effectiveSubChannelId
        ? Number(effectiveSubChannelId)
        : undefined,
      areaId: toNumberValue(areaId),
      invoiceType:
        invoiceType && invoiceType !== 'ALL'
          ? (invoiceType as ReportInvoiceTypeParam)
          : '',
      startDate: toIsoDate(range?.from),
      endDate: toIsoDate(range?.to),
    })
  }

  const handleReset = () => {
    const resetSubChannelId = canPickSubChannel ? '' : lockedSubChannelId
    setSubChannelId(resetSubChannelId)
    setAreaId('')
    setInvoiceType('ALL')
    setRange(undefined)
    setErrors({ subChannelId: false, areaId: false })
    onReset?.()
    onApply?.({
      subChannelId: resetSubChannelId ? Number(resetSubChannelId) : undefined,
      areaId: undefined,
      invoiceType: '',
      startDate: undefined,
      endDate: undefined,
    })
  }

  return (
    <div className='rounded-sm border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900'>
      <div className='flex flex-nowrap items-end gap-2 overflow-x-auto pb-1'>
        <div className='flex min-w-[170px] shrink-0 flex-col gap-2'>
          <Select
            value={effectiveSubChannelId}
            onValueChange={(value) => {
              setSubChannelId(value)
              setAreaId('')
              setErrors((prev) => ({ ...prev, subChannelId: false, areaId: false }))
            }}
            disabled={loadingSubChannels || !canPickSubChannel}
          >
            <SelectTrigger
              id='area-report-sub-channel'
              className={cn(
                controlHeight,
                'w-full',
                errors.subChannelId ? 'border-red-500 text-red-600' : ''
              )}
              aria-invalid={errors.subChannelId}
            >
              <SelectValue placeholder='Select Sub Channel' />
            </SelectTrigger>
            <SelectContent>
              {subChannels.map((subChannel) => (
                <SelectItem key={subChannel.id} value={String(subChannel.id)}>
                  {subChannel.subChannelName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex min-w-[170px] shrink-0 flex-col gap-2'>
          <Select
            value={areaId}
            onValueChange={(value) => {
              setAreaId(value)
              setErrors((prev) => ({ ...prev, areaId: false }))
            }}
            disabled={loadingAreas || !effectiveSubChannelId}
          >
            <SelectTrigger
              id='area-report-area'
              className={cn(
                controlHeight,
                'w-full',
                errors.areaId ? 'border-red-500 text-red-600' : ''
              )}
              aria-invalid={errors.areaId}
            >
              <SelectValue placeholder='Select Area' />
            </SelectTrigger>
            <SelectContent>
              {areas.map((area) => (
                <SelectItem key={area.id} value={String(area.id)}>
                  {area.areaName ?? `Area ${area.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex min-w-[180px] shrink-0 flex-col gap-2'>
          <Select
            value={invoiceType}
            onValueChange={(value) => setInvoiceType(value as InvoiceTypeParam)}
          >
            <SelectTrigger id='area-report-type' className={cn(controlHeight, 'w-full')}>
              <SelectValue placeholder='Select Invoice Type' />
            </SelectTrigger>
            <SelectContent>
              {invoiceTypeOptions.map((option) => (
                <SelectItem
                  key={option.value || 'ALL'}
                  value={option.value as InvoiceTypeParam}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex min-w-[240px] shrink-0 flex-col gap-2'>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id='area-report-date-range'
                variant='outline'
                className={cn(
                  controlHeight,
                  'w-full justify-between text-left font-normal',
                  !range?.from && !range?.to && 'text-muted-foreground'
                )}
              >
                <span className='flex items-center gap-2 truncate'>
                  <CalendarIcon className='h-4 w-4 opacity-60' />
                  <span className='truncate'>
                    {range?.from && range?.to
                      ? `${formatLocalDate(range.from)} ~ ${formatLocalDate(range.to)}`
                      : range?.from
                        ? formatLocalDate(range.from)
                        : 'Select date range'}
                  </span>
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0' align='start'>
              <Calendar
                mode='range'
                captionLayout='dropdown'
                numberOfMonths={2}
                selected={range}
                onSelect={setRange}
              />
              {range?.from || range?.to ? (
                <div className='flex justify-end border-t p-2'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => setRange(undefined)}
                  >
                    Clear
                  </Button>
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
        </div>

        <div className='flex min-w-[240px] shrink-0 flex-col gap-2 sm:flex-row sm:items-end'>
          <Button
            className={cn(controlHeight, 'min-w-[150px]')}
            onClick={handleApply}
          >
            Apply Filters
          </Button>
          <Button
            variant='outline'
            className={cn(controlHeight, 'min-w-[150px]')}
            onClick={handleReset}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  )
}
