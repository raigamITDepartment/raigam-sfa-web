import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import {
  getAllArea,
  getAllUserDetails,
  getTerritoriesByAreaId,
  type ApiResponse,
  type AreaDTO,
  type TerritoryDTO,
  type UserDetailsDTO,
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

export type GPSMonitoringFilters = {
  trackingDate?: string
  areaId?: number
  territoryId?: number
  salesRepId?: number
  fromTime?: string
  toTime?: string
}

type GPSMonitoringFilterProps = {
  initialValues?: GPSMonitoringFilters
  onApply?: (filters: GPSMonitoringFilters) => void
  onReset?: () => void
}

const toIsoDate = (value?: Date | null) =>
  value ? value.toISOString().slice(0, 10) : undefined

const parseDate = (value?: string) => {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

const toSelectValue = (value?: number | string | null) => {
  if (value === 0 || value === '0') return ''
  if (value === undefined || value === null || value === '') return ''
  return String(value)
}

const formatDateLabel = (date?: Date) =>
  date ? format(date, 'MMM d, yyyy') : 'Select tracking date'

const DEFAULT_FROM_TIME = '08:00'
const DEFAULT_TO_TIME = '17:30'
const TIME_STEP_MINUTES = 15
const buildTimeOptions = (stepMinutes: number) => {
  const options: string[] = []
  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    options.push(
      `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
    )
  }
  return options
}
const formatTimeLabel = (value: string) => {
  const [hourStr, minuteStr] = value.split(':')
  const hour = Number(hourStr)
  const minutes = Number(minuteStr)
  if (Number.isNaN(hour) || Number.isNaN(minutes)) return value
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`
}
const TIME_OPTIONS = buildTimeOptions(TIME_STEP_MINUTES)

export function GPSMonitoringFilter({
  initialValues,
  onApply,
  onReset,
}: GPSMonitoringFilterProps) {
  const controlHeight = 'h-9'
  const timeTriggerClass = cn(
    controlHeight,
    'w-full bg-slate-50 text-slate-800 placeholder:text-slate-400 focus-visible:border-slate-400 focus-visible:ring-slate-300/40 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus-visible:border-slate-500 dark:focus-visible:ring-slate-500/40'
  )
  const [trackingDate, setTrackingDate] = useState<Date | undefined>(
    parseDate(initialValues?.trackingDate)
  )
  const [areaId, setAreaId] = useState<string>(
    toSelectValue(initialValues?.areaId)
  )
  const [territoryId, setTerritoryId] = useState<string>(
    toSelectValue(initialValues?.territoryId)
  )
  const [salesRepId, setSalesRepId] = useState<string>(
    toSelectValue(initialValues?.salesRepId)
  )
  const [fromTime, setFromTime] = useState<string>(
    initialValues?.fromTime ?? DEFAULT_FROM_TIME
  )
  const [toTime, setToTime] = useState<string>(
    initialValues?.toTime ?? DEFAULT_TO_TIME
  )

  useEffect(() => {
    if (!initialValues) return
    setTrackingDate(parseDate(initialValues.trackingDate))
    setAreaId(toSelectValue(initialValues.areaId))
    setTerritoryId(toSelectValue(initialValues.territoryId))
    setSalesRepId(toSelectValue(initialValues.salesRepId))
    setFromTime(initialValues.fromTime ?? '')
    setToTime(initialValues.toTime ?? '')
  }, [initialValues])

  const { data: areas = [], isLoading: loadingAreas } = useQuery({
    queryKey: ['gps-monitoring', 'areas'],
    queryFn: async () => {
      const res = (await getAllArea()) as ApiResponse<AreaDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: territories = [],
    isLoading: loadingTerritories,
    isFetching: fetchingTerritories,
  } = useQuery({
    queryKey: ['gps-monitoring', 'territories', areaId],
    queryFn: async () => {
      const res = (await getTerritoriesByAreaId(Number(areaId))) as ApiResponse<
        TerritoryDTO[]
      >
      return res.payload ?? []
    },
    enabled: Boolean(areaId),
    staleTime: 5 * 60 * 1000,
  })

  const { data: salesReps = [], isLoading: loadingSalesReps } = useQuery({
    queryKey: ['gps-monitoring', 'sales-reps'],
    queryFn: async () => {
      const res = (await getAllUserDetails()) as ApiResponse<UserDetailsDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const salesRepOptions = useMemo(
    () =>
      salesReps.map((rep) => ({
        id: rep.id,
        label: rep.name ?? `User ${rep.id}`,
      })),
    [salesReps]
  )

  const handleApply = () => {
    onApply?.({
      trackingDate: toIsoDate(trackingDate),
      areaId: areaId ? Number(areaId) : undefined,
      territoryId: territoryId ? Number(territoryId) : undefined,
      salesRepId: salesRepId ? Number(salesRepId) : undefined,
      fromTime: fromTime || undefined,
      toTime: toTime || undefined,
    })
  }

  const handleReset = () => {
    setTrackingDate(undefined)
    setAreaId('')
    setTerritoryId('')
    setSalesRepId('')
    setFromTime(DEFAULT_FROM_TIME)
    setToTime(DEFAULT_TO_TIME)
    onReset?.()
  }

  return (
    <div className='rounded-sm border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900'>
      <div className='flex flex-wrap items-end gap-2'>
        <div className='flex min-w-[210px] flex-col gap-2'>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id='gps-tracking-date'
                variant='outline'
                className={cn(
                  controlHeight,
                  'w-full justify-between text-left font-normal',
                  !trackingDate && 'text-muted-foreground'
                )}
              >
                <span className='truncate'>{formatDateLabel(trackingDate)}</span>
                <CalendarIcon className='h-4 w-4 opacity-50' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0' align='start'>
              <Calendar
                mode='single'
                captionLayout='dropdown'
                selected={trackingDate}
                onSelect={setTrackingDate}
                disabled={(date: Date) =>
                  date > new Date() || date < new Date('1900-01-01')
                }
              />
                </PopoverContent>
          </Popover>
        </div>

        <div className='flex min-w-[240px] flex-col gap-2'>
          <Select
            value={areaId}
            onValueChange={(value) => {
              setAreaId(value)
              setTerritoryId('')
            }}
            disabled={loadingAreas}
          >
            <SelectTrigger
              id='gps-area'
              className={cn(controlHeight, 'w-full')}
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

        <div className='flex min-w-[240px] flex-col gap-2'>
          <Select
            value={territoryId}
            onValueChange={(value) => {
              setTerritoryId(value)
            }}
            disabled={
              !areaId || loadingTerritories || fetchingTerritories
            }
          >
            <SelectTrigger
              id='gps-territory'
              className={cn(controlHeight, 'w-full')}
            >
              <SelectValue placeholder='Select Territory' />
            </SelectTrigger>
            <SelectContent>
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

        <div className='flex min-w-[220px] flex-col gap-2'>
          <Select
            value={salesRepId}
            onValueChange={setSalesRepId}
            disabled={loadingSalesReps}
          >
            <SelectTrigger
              id='gps-sales-rep'
              className={cn(controlHeight, 'w-full')}
            >
              <SelectValue placeholder='Select Sales Rep' />
            </SelectTrigger>
            <SelectContent>
              {salesRepOptions.map((rep) => (
                <SelectItem key={rep.id} value={String(rep.id)}>
                  {rep.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-2'>
          <Select value={fromTime} onValueChange={setFromTime}>
            <SelectTrigger id='gps-from-time' className={timeTriggerClass}>
              <SelectValue placeholder='From time' />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((time) => (
                <SelectItem key={time} value={time}>
                  {formatTimeLabel(time)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-2'>
          <Select value={toTime} onValueChange={setToTime}>
            <SelectTrigger id='gps-to-time' className={timeTriggerClass}>
              <SelectValue placeholder='To time' />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((time) => (
                <SelectItem key={time} value={time}>
                  {formatTimeLabel(time)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex items-end'>
          <Button
            className={cn(controlHeight, 'min-w-[150px]')}
            onClick={handleApply}
          >
            Apply Filters
          </Button>
        </div>

        <div className='flex items-end'>
          <Button
            variant='outline'
            className={cn(controlHeight, 'min-w-[150px]')}
            onClick={handleReset}
          >
            Reset All
          </Button>
        </div>
      </div>
    </div>
  )
}

export default GPSMonitoringFilter
