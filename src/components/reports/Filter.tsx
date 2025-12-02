import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarIcon, X } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import {
  getAllArea,
  getAllTerritories,
  getTerritoriesByAreaId,
  type ApiResponse,
  type AreaDTO,
  type TerritoryDTO,
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
import { cn } from '@/lib/utils'

export type TerritoryWiseItemsFilters = {
  areaId?: number
  territoryId?: number
  startDate?: string
  endDate?: string
}

type FilterProps = {
  initialValues?: TerritoryWiseItemsFilters
  onApply?: (filters: TerritoryWiseItemsFilters) => void
}

const toIsoDate = (value?: Date | null) =>
  value ? value.toISOString().slice(0, 10) : undefined

const parseDate = (value?: string) => {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

const formatRangeLabel = (range?: DateRange) => {
  if (!range?.from && !range?.to) return 'Select date range'
  if (range?.from && range?.to) {
    return `${range.from.toISOString().slice(0, 10)} ~ ${range.to
      .toISOString()
      .slice(0, 10)}`
  }
  return range?.from ? range.from.toISOString().slice(0, 10) : 'Select date range'
}

export default function TerritoryWiseItemsFilter({
  initialValues,
  onApply,
}: FilterProps) {
  const controlHeight = 'h-11 min-h-[44px]'
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [areaId, setAreaId] = useState<string>('all')
  const [territoryId, setTerritoryId] = useState<string>('')
  const [range, setRange] = useState<DateRange | undefined>({
    from: parseDate(initialValues?.startDate ?? todayIso),
    to: parseDate(initialValues?.endDate ?? todayIso),
  })
  const [errors, setErrors] = useState({
    territoryId: false,
    dateRange: false,
  })

  useEffect(() => {
    if (!initialValues) return
    setAreaId(
      initialValues.areaId !== undefined && initialValues.areaId !== null
        ? String(initialValues.areaId)
        : 'all'
    )
    setTerritoryId(
      initialValues.territoryId !== undefined && initialValues.territoryId !== null
        ? String(initialValues.territoryId)
        : ''
    )
    setRange({
      from: parseDate(initialValues.startDate ?? todayIso),
      to: parseDate(initialValues.endDate ?? todayIso),
    })
  }, [initialValues, todayIso])

  const { data: areas, isLoading: loadingAreas } = useQuery({
    queryKey: ['reports', 'areas'],
    queryFn: async () => {
      const res = (await getAllArea()) as ApiResponse<AreaDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: territories,
    isLoading: loadingTerritories,
    isFetching: fetchingTerritories,
  } = useQuery({
    queryKey: ['reports', 'territories', areaId || 'all'],
    queryFn: async () => {
      if (areaId && areaId !== 'all') {
        const res = (await getTerritoriesByAreaId(Number(areaId))) as ApiResponse<
          TerritoryDTO[]
        >
        return res.payload ?? []
      }
      const res = (await getAllTerritories()) as ApiResponse<TerritoryDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const handleApply = () => {
    const hasDate = Boolean(range?.from && range?.to)
    const hasTerritory = Boolean(territoryId)
    setErrors({
      territoryId: !hasTerritory,
      dateRange: !hasDate,
    })
    if (!hasDate || !hasTerritory) return

    onApply?.({
      areaId: areaId && areaId !== 'all' ? Number(areaId) : undefined,
      territoryId: territoryId ? Number(territoryId) : undefined,
      startDate: toIsoDate(range?.from),
      endDate: toIsoDate(range?.to),
    })
  }

  const handleClearDates = () => {
    setRange(undefined)
    setErrors((prev) => ({ ...prev, dateRange: false }))
  }

  return (
    <div className='flex flex-wrap items-end gap-3'>
      <div className='flex min-w-[180px] flex-1 flex-col gap-2'>
        <Select
          value={areaId}
          onValueChange={(value) => {
            setAreaId(value)
            setTerritoryId('')
          }}
          disabled={loadingAreas}
        >
          <SelectTrigger className={cn(controlHeight, 'w-full bg-slate-50')}>
            <SelectValue placeholder='Select Area' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Areas</SelectItem>
            {areas?.map((area) => (
              <SelectItem key={area.id} value={String(area.id)}>
                {area.areaName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='flex min-w-[180px] flex-1 flex-col gap-2'>
        <Select
          value={territoryId}
          onValueChange={(value) => {
            setTerritoryId(value)
            setErrors((prev) => ({ ...prev, territoryId: false }))
          }}
          disabled={loadingTerritories || fetchingTerritories}
        >
          <SelectTrigger
            className={cn(
              controlHeight,
              'w-full bg-slate-50',
              errors.territoryId ? 'border-red-500 text-red-600' : ''
            )}
            aria-invalid={errors.territoryId}
          >
            <SelectValue placeholder='Select Territory' />
          </SelectTrigger>
          <SelectContent>
            {territories?.map((territory) => (
              <SelectItem key={territory.id} value={String(territory.id)}>
                {territory.territoryName ??
                  territory.name ??
                  `Territory ${territory.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='flex min-w-[220px] flex-1 flex-col gap-2'>
        <div className='flex items-center gap-2'>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                className={cn(
                  controlHeight,
                  'w-full justify-between rounded-md border bg-slate-50 text-left font-normal',
                  errors.dateRange ? 'border-red-500 text-red-600' : ''
                )}
                aria-invalid={errors.dateRange}
              >
                <div className='flex items-center gap-2'>
                  <CalendarIcon className='h-4 w-4 opacity-70' />
                  <span className='truncate'>{formatRangeLabel(range)}</span>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0' align='start'>
              <Calendar
                mode='range'
                captionLayout='dropdown'
                numberOfMonths={2}
                selected={range}
                onSelect={(value) => {
                  setRange(value)
                  setErrors((prev) => ({ ...prev, dateRange: false }))
                }}
              />
            </PopoverContent>
          </Popover>
          {range?.from || range?.to ? (
            <Button
              variant='outline'
              size='icon'
              className={cn(controlHeight, 'w-11 min-w-[44px] bg-slate-50')}
              onClick={handleClearDates}
              aria-label='Clear date range'
            >
              <X className='h-4 w-4' />
            </Button>
          ) : null}
        </div>
      </div>

      <div className='flex items-center'>
        <Button className={cn(controlHeight, 'px-6')} onClick={handleApply}>
          Load Report
        </Button>
      </div>
    </div>
  )
}
