import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import {
  getAllArea,
  getAllRange,
  getAllSubChannel,
  getAreasBySubChannelId,
  getTerritoriesByAreaId,
  type ApiResponse,
  type AreaDTO,
  type RangeDTO,
  type SubChannelDTO,
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
import { useAppSelector } from '@/store/hooks'
import { cn } from '@/lib/utils'

export type TimeAttendanceFilters = {
  subChannelId?: number
  areaId?: number
  rangeId?: number
  territoryId?: number
  startDate?: string
  endDate?: string
}

type TimeAttendanceFilterProps = {
  initialValues?: TimeAttendanceFilters
  onApply?: (filters: TimeAttendanceFilters) => void
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

const formatRangeLabel = (range?: DateRange) => {
  if (!range?.from && !range?.to) return 'Select date range'
  if (range?.from && range?.to) {
    return `${formatLocalDate(range.from)} ~ ${formatLocalDate(range.to)}`
  }
  return range?.from ? formatLocalDate(range.from) : 'Select date range'
}

const getCurrentMonthRange = (baseDate: Date) => {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)
  return { from: start, to: end }
}

const toSelectValue = (value?: number | null) =>
  value === undefined || value === null ? '0' : String(value)

const toNumberValue = (value: string) => {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

export default function TimeAttendanceFilter({
  initialValues,
  onApply,
  onReset,
}: TimeAttendanceFilterProps) {
  const controlHeight = 'h-9 min-h-[36px]'
  const defaultRange = useMemo(
    () => getCurrentMonthRange(new Date()),
    []
  )
  const user = useAppSelector((state) => state.auth.user)
  const [subChannelId, setSubChannelId] = useState<string>(
    toSelectValue(initialValues?.subChannelId)
  )
  const [areaId, setAreaId] = useState<string>(
    toSelectValue(initialValues?.areaId)
  )
  const [rangeId, setRangeId] = useState<string>(
    toSelectValue(initialValues?.rangeId)
  )
  const [territoryId, setTerritoryId] = useState<string>(
    toSelectValue(initialValues?.territoryId)
  )
  const [range, setRange] = useState<DateRange | undefined>(() => {
    if (initialValues?.startDate || initialValues?.endDate) {
      return {
        from: parseDate(initialValues.startDate) ?? defaultRange.from,
        to: parseDate(initialValues.endDate) ?? defaultRange.to,
      }
    }
    return { from: defaultRange.from, to: defaultRange.to }
  })

  useEffect(() => {
    if (!initialValues) {
      setSubChannelId('0')
      setAreaId('0')
      setRangeId('0')
      setTerritoryId('0')
      setRange({ from: defaultRange.from, to: defaultRange.to })
      return
    }
    setSubChannelId(toSelectValue(initialValues.subChannelId))
    setAreaId(toSelectValue(initialValues.areaId))
    setRangeId(toSelectValue(initialValues.rangeId))
    setTerritoryId(toSelectValue(initialValues.territoryId))
    setRange({
      from: parseDate(initialValues.startDate) ?? defaultRange.from,
      to: parseDate(initialValues.endDate) ?? defaultRange.to,
    })
  }, [initialValues, defaultRange.from, defaultRange.to])

  const userAreas = useMemo<AreaDTO[] | null>(() => {
    const list = (user as { areaNameList?: unknown })?.areaNameList
    if (!Array.isArray(list) || list.length === 0) return null
    const mapped = list
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const record = item as {
          id?: number | string
          areaId?: number | string
          name?: string
          areaName?: string
        }
        const id = record.id ?? record.areaId
        if (id === undefined || id === null) return null
        return {
          id,
          areaName: record.name ?? record.areaName ?? `Area ${id}`,
        } as AreaDTO
      })
      .filter(Boolean) as AreaDTO[]
    return mapped.length ? mapped : null
  }, [user])

  const useUserAreas = Boolean(userAreas?.length)

  const { data: subChannels = [], isLoading: loadingSubChannels } = useQuery({
    queryKey: ['time-attendance', 'sub-channels'],
    queryFn: async () => {
      const res = (await getAllSubChannel()) as ApiResponse<SubChannelDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: apiAreas = [], isLoading: loadingApiAreas } = useQuery({
    queryKey: [
      'time-attendance',
      'areas',
      !useUserAreas && subChannelId !== '0' ? subChannelId : 'all',
    ],
    enabled: !useUserAreas,
    queryFn: async () => {
      const res = (await (subChannelId !== '0'
        ? getAreasBySubChannelId(Number(subChannelId))
        : getAllArea())) as ApiResponse<AreaDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const areas = useUserAreas ? userAreas ?? [] : apiAreas
  const loadingAreas = useUserAreas ? false : loadingApiAreas

  const { data: ranges = [], isLoading: loadingRanges } = useQuery({
    queryKey: ['time-attendance', 'ranges'],
    queryFn: async () => {
      const res = (await getAllRange()) as ApiResponse<RangeDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: territories = [],
    isLoading: loadingTerritories,
    isFetching: fetchingTerritories,
  } = useQuery({
    queryKey: ['time-attendance', 'territories', areaId],
    enabled: areaId !== '0',
    queryFn: async () => {
      if (areaId === '0') return []
      const res = (await getTerritoriesByAreaId(
        Number(areaId)
      )) as ApiResponse<TerritoryDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const handleApply = () => {
    onApply?.({
      subChannelId: toNumberValue(subChannelId),
      areaId: toNumberValue(areaId),
      rangeId: toNumberValue(rangeId),
      territoryId: toNumberValue(territoryId),
      startDate: toIsoDate(range?.from),
      endDate: toIsoDate(range?.to),
    })
  }

  const handleReset = () => {
    setSubChannelId('0')
    setAreaId('0')
    setRangeId('0')
    setTerritoryId('0')
    setRange({ from: defaultRange.from, to: defaultRange.to })
    onReset?.()
    onApply?.({
      subChannelId: 0,
      areaId: 0,
      rangeId: 0,
      territoryId: 0,
      startDate: toIsoDate(defaultRange.from),
      endDate: toIsoDate(defaultRange.to),
    })
  }

  return (
    <div className='rounded-sm border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900'>
      <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end'>
        <div className='flex w-full flex-col gap-2 sm:w-[220px]'>
          <Select
            value={subChannelId}
            onValueChange={(value) => {
              setSubChannelId(value)
              setAreaId('0')
              setTerritoryId('0')
            }}
            disabled={loadingSubChannels}
          >
            <SelectTrigger
              id='time-attendance-sub-channel'
              className={cn(controlHeight, 'w-full')}
            >
              <SelectValue placeholder='Select Sub Channel' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='0'>All Sub Channels</SelectItem>
              {subChannels.map((subChannel) => (
                <SelectItem key={subChannel.id} value={String(subChannel.id)}>
                  {subChannel.subChannelName ?? `Sub Channel ${subChannel.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-full flex-col gap-2 sm:w-[200px]'>
          <Select
            value={rangeId}
            onValueChange={setRangeId}
            disabled={loadingRanges}
          >
            <SelectTrigger
              id='time-attendance-range-select'
              className={cn(controlHeight, 'w-full')}
            >
              <SelectValue placeholder='Select Range' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='0'>All Ranges</SelectItem>
              {ranges
                .map((rangeItem) => {
                  const id = rangeItem.id ?? rangeItem.rangeId
                  if (id === undefined || id === null) return null
                  return {
                    id: String(id),
                    label: rangeItem.rangeName ?? `Range ${String(id)}`,
                  }
                })
                .filter(Boolean)
                .map((rangeItem) => (
                  <SelectItem key={rangeItem!.id} value={rangeItem!.id}>
                    {rangeItem!.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-full flex-col gap-2 sm:w-[220px]'>
          <Select
            value={areaId}
            onValueChange={(value) => {
              setAreaId(value)
              setTerritoryId('0')
            }}
            disabled={loadingAreas}
          >
            <SelectTrigger
              id='time-attendance-area'
              className={cn(controlHeight, 'w-full')}
            >
              <SelectValue placeholder='Select Area' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='0'>Select Area</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area.id} value={String(area.id)}>
                  {area.areaName ?? `Area ${area.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-full flex-col gap-2 sm:w-[220px]'>
          <Select
            value={territoryId}
            onValueChange={setTerritoryId}
            disabled={
              areaId === '0' || loadingTerritories || fetchingTerritories
            }
          >
            <SelectTrigger
              id='time-attendance-territory'
              className={cn(controlHeight, 'w-full')}
            >
              <SelectValue placeholder='Select Territory' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='0'>All Territories</SelectItem>
              {territories.map((territory) => (
                <SelectItem key={territory.id} value={String(territory.id)}>
                  {territory.territoryName ??
                    territory.name ??
                    `Territory ${territory.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-full flex-col gap-2 sm:w-[240px]'>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id='time-attendance-date-range'
                variant='outline'
                className={cn(
                  controlHeight,
                  'w-full justify-between text-left font-normal'
                )}
              >
                <span className='flex items-center gap-2 truncate'>
                  <CalendarIcon className='h-4 w-4 opacity-60' />
                  <span className='truncate'>{formatRangeLabel(range)}</span>
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
            </PopoverContent>
          </Popover>
        </div>

        <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end'>
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
