import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import {
  getAllOutletsByRouteId,
  getAllSubChannel,
  getAreasBySubChannelId,
  getTerritoriesByAreaId,
  getRoutesByTerritoryId,
  type ApiResponse,
  type AreaDTO,
  type OutletDTO,
  type RouteDTO,
  type SubChannelDTO,
  type TerritoryDTO,
} from '@/services/userDemarcationApi'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { useAppSelector } from '@/store/hooks'
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
  subChannelId?: number
  areaId?: number
  territoryId?: number
  routeId?: number
  outletId?: number
  startDate?: string
  endDate?: string
}

type FilterProps = {
  initialValues?: TerritoryWiseItemsFilters
  onApply?: (filters: TerritoryWiseItemsFilters) => void
}

const pad2 = (value: number) => String(value).padStart(2, '0')
const formatLocalDate = (value: Date) =>
  `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`
const toIsoDate = (value?: Date | null) =>
  value ? formatLocalDate(value) : undefined

const parseDate = (value?: string) => {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

const formatRangeLabel = (range?: DateRange) => {
  if (!range?.from && !range?.to) return 'Select date range'
  if (range?.from && range?.to) {
    return `${formatLocalDate(range.from)} ~ ${formatLocalDate(range.to)}`
  }
  return range?.from ? formatLocalDate(range.from) : 'Select date range'
}

export default function TerritoryWiseItemsFilter({
  initialValues,
  onApply,
}: FilterProps) {
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
  const [areaId, setAreaId] = useState<string>('0')
  const [territoryId, setTerritoryId] = useState<string>('0')
  const [routeId, setRouteId] = useState<string>('0')
  const [outletId, setOutletId] = useState<string>('0')
  const [range, setRange] = useState<DateRange | undefined>({
    from: parseDate(initialValues?.startDate ?? todayIso),
    to: parseDate(initialValues?.endDate ?? todayIso),
  })
  const [errors, setErrors] = useState({
    subChannelId: false,
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
        : '0'
    )
    setTerritoryId(
      initialValues.territoryId !== undefined &&
        initialValues.territoryId !== null
        ? String(initialValues.territoryId)
        : '0'
    )
    setRouteId(
      initialValues.routeId !== undefined && initialValues.routeId !== null
        ? String(initialValues.routeId)
        : '0'
    )
    setOutletId(
      initialValues.outletId !== undefined && initialValues.outletId !== null
        ? String(initialValues.outletId)
        : '0'
    )
    setRange({
      from: parseDate(initialValues.startDate ?? todayIso),
      to: parseDate(initialValues.endDate ?? todayIso),
    })
  }, [initialValues, todayIso, canPickSubChannel, lockedSubChannelId])

  useEffect(() => {
    if (canPickSubChannel) return
    if (!lockedSubChannelId) return
    if (subChannelId === lockedSubChannelId) return
    setSubChannelId(lockedSubChannelId)
    setAreaId('0')
    setTerritoryId('0')
    setRouteId('0')
    setOutletId('0')
  }, [canPickSubChannel, lockedSubChannelId, subChannelId])

  const { data: subChannels, isLoading: loadingSubChannels } = useQuery({
    queryKey: ['reports', 'sub-channels'],
    enabled: canPickSubChannel,
    queryFn: async () => {
      const res = (await getAllSubChannel()) as ApiResponse<SubChannelDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: areas, isLoading: loadingAreas } = useQuery({
    queryKey: ['reports', 'areas', effectiveSubChannelId || 'none'],
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

  const {
    data: territories,
    isLoading: loadingTerritories,
    isFetching: fetchingTerritories,
  } = useQuery({
    queryKey: ['reports', 'territories', areaId || 'none'],
    enabled: Boolean(areaId) && areaId !== '0',
    queryFn: async () => {
      if (!areaId || areaId === '0') return []
      const res = (await getTerritoriesByAreaId(Number(areaId))) as ApiResponse<
        TerritoryDTO[]
      >
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: routes,
    isLoading: loadingRoutes,
    isFetching: fetchingRoutes,
  } = useQuery({
    queryKey: ['reports', 'routes', territoryId || 'none'],
    enabled: Boolean(territoryId) && territoryId !== '0',
    queryFn: async () => {
      if (!territoryId || territoryId === '0') return []
      const res = (await getRoutesByTerritoryId(
        Number(territoryId)
      )) as ApiResponse<RouteDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: outlets,
    isLoading: loadingOutlets,
    isFetching: fetchingOutlets,
  } = useQuery({
    queryKey: ['reports', 'outlets', routeId || 'none'],
    enabled: Boolean(routeId) && routeId !== '0',
    queryFn: async () => {
      if (!routeId || routeId === '0') return []
      const res = (await getAllOutletsByRouteId(
        Number(routeId)
      )) as ApiResponse<OutletDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const handleApply = () => {
    const hasSubChannel = Boolean(effectiveSubChannelId)
    const requiresSubChannel = canPickSubChannel
    setErrors({
      subChannelId: requiresSubChannel && !hasSubChannel,
    })
    if (requiresSubChannel && !hasSubChannel) return

    onApply?.({
      subChannelId: effectiveSubChannelId
        ? Number(effectiveSubChannelId)
        : undefined,
      areaId: areaId ? Number(areaId) : undefined,
      territoryId: territoryId ? Number(territoryId) : undefined,
      routeId: routeId ? Number(routeId) : undefined,
      outletId: outletId ? Number(outletId) : undefined,
      startDate: toIsoDate(range?.from),
      endDate: toIsoDate(range?.to),
    })
  }

  const handleReset = () => {
    const resetSubChannelId = canPickSubChannel ? '' : lockedSubChannelId
    setSubChannelId(resetSubChannelId)
    setAreaId('0')
    setTerritoryId('0')
    setRouteId('0')
    setOutletId('0')
    setRange(undefined)
    setErrors({ subChannelId: false })
    onApply?.({
      subChannelId: resetSubChannelId ? Number(resetSubChannelId) : undefined,
      areaId: 0,
      territoryId: 0,
      routeId: 0,
      outletId: 0,
      startDate: undefined,
      endDate: undefined,
    })
  }

  const handleClearDates = () => {
    setRange(undefined)
  }

  return (
    <div className='flex flex-wrap items-end gap-3'>
      {canPickSubChannel ? (
        <div className='flex w-full min-w-0 flex-1 flex-col gap-2 sm:min-w-[200px]'>
          <Select
            value={subChannelId}
            onValueChange={(value) => {
              setSubChannelId(value)
              setAreaId('0')
              setTerritoryId('0')
              setRouteId('0')
              setOutletId('0')
              setErrors((prev) => ({ ...prev, subChannelId: false }))
            }}
            disabled={loadingSubChannels}
          >
            <SelectTrigger
              className={cn(
                controlHeight,
                'w-full bg-slate-50 text-left',
                errors.subChannelId ? 'border-red-500 text-red-600' : ''
              )}
              aria-invalid={errors.subChannelId}
            >
              <SelectValue placeholder='Select Sub Channel' />
            </SelectTrigger>
            <SelectContent>
              {subChannels?.map((subChannel) => (
                <SelectItem
                  key={subChannel.id}
                  value={String(subChannel.id)}
                >
                  {subChannel.subChannelName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className='flex w-full min-w-0 flex-1 flex-col gap-2 sm:min-w-[180px]'>
        <Select
          value={areaId}
          onValueChange={(value) => {
            setAreaId(value)
            setTerritoryId('')
            setRouteId('')
            setOutletId('')
          }}
          disabled={loadingAreas || !effectiveSubChannelId}
        >
          <SelectTrigger
            className={cn(controlHeight, 'w-full bg-slate-50 text-left')}
          >
            <SelectValue placeholder='Select Area' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='0'>All Areas</SelectItem>
            {areas?.map((area) => (
              <SelectItem key={area.id} value={String(area.id)}>
                {area.areaName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='flex w-full min-w-0 flex-1 flex-col gap-2 sm:min-w-[180px]'>
        <Select
          value={territoryId}
          onValueChange={(value) => {
            setTerritoryId(value)
            setRouteId('')
            setOutletId('')
          }}
          disabled={
            loadingTerritories ||
            fetchingTerritories ||
            !areaId ||
            areaId === '0'
          }
        >
          <SelectTrigger
            className={cn(controlHeight, 'w-full bg-slate-50 text-left')}
          >
            <SelectValue placeholder='Select Territory' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='0'>All Territories</SelectItem>
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

      <div className='flex w-full min-w-0 flex-1 flex-col gap-2 sm:min-w-[180px]'>
        <Select
          value={routeId}
          onValueChange={(value) => {
            setRouteId(value)
            setOutletId('')
          }}
          disabled={
            loadingRoutes ||
            fetchingRoutes ||
            !territoryId ||
            territoryId === '0'
          }
        >
          <SelectTrigger
            className={cn(controlHeight, 'w-full bg-slate-50 text-left')}
          >
            <SelectValue placeholder='Select Route' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='0'>All Routes</SelectItem>
            {routes?.map((route) => (
              <SelectItem key={route.id} value={String(route.id)}>
                {route.routeName ?? `Route ${route.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='flex w-full min-w-0 flex-1 flex-col gap-2 sm:min-w-[180px]'>
        <Select
          value={outletId}
          onValueChange={(value) => {
            setOutletId(value)
          }}
          disabled={
            loadingOutlets || fetchingOutlets || !routeId || routeId === '0'
          }
        >
          <SelectTrigger
            className={cn(controlHeight, 'w-full bg-slate-50 text-left')}
          >
            <SelectValue placeholder='Select Outlet' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='0'>All Outlets</SelectItem>
            {outlets?.map((outlet) => (
              <SelectItem key={outlet.id} value={String(outlet.id)}>
                {outlet.name ?? `Outlet ${outlet.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='flex w-full min-w-0 flex-1 flex-col gap-2 sm:min-w-[220px]'>
        <div className='relative w-full'>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                className={cn(
                  controlHeight,
                  'w-full min-w-0 justify-between rounded-md border bg-slate-50 text-left font-normal',
                )}
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
                onSelect={setRange}
              />
              {range?.from || range?.to ? (
                <div className='flex justify-end border-t p-2'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={handleClearDates}
                  >
                    Clear
                  </Button>
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center'>
        <Button
          className={cn(controlHeight, 'w-full px-6 sm:w-auto')}
          onClick={handleApply}
        >
          Apply filters
        </Button>
        <Button
          variant='outline'
          className={cn(controlHeight, 'w-full px-6 sm:w-auto')}
          onClick={handleReset}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}
