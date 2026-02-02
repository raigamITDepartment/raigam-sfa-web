import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import {
  getAllOutletCategory,
  getAllSubChannel,
  getAreasBySubChannelId,
  getTerritoriesByAreaId,
  getRoutesByTerritoryId,
  type ApiResponse,
  type AreaDTO,
  type OutletCategoryDTO,
  type RouteDTO,
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
import type { ReportInvoiceTypeParam } from '@/types/invoice'

export type NotVisitedOutletFilters = {
  subChannelId?: number
  areaId?: number
  territoryId?: number
  routeId?: number
  outletCategoryId?: number
  invoiceType?: ReportInvoiceTypeParam
  startDate?: string
  endDate?: string
}

type NotVisitedFilterProps = {
  initialValues?: NotVisitedOutletFilters
  onApply?: (filters: NotVisitedOutletFilters) => void
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
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

const invoiceTypeOptions: Array<{
  label: string
  value: 'ALL' | ReportInvoiceTypeParam
}> = [
  { label: 'All Invoice Types', value: 'ALL' },
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Agency', value: 'AGENCY' },
  { label: 'Company', value: 'COMPANY' },
]

export default function NotVisitedFilter({
  initialValues,
  onApply,
  onReset,
}: NotVisitedFilterProps) {
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
  const [outletCategoryId, setOutletCategoryId] = useState<string>('0')
  const [invoiceType, setInvoiceType] = useState<ReportInvoiceTypeParam>('')
  const invoiceTypeValue = invoiceType || 'ALL'
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
    setOutletCategoryId(
      initialValues.outletCategoryId !== undefined &&
        initialValues.outletCategoryId !== null
        ? String(initialValues.outletCategoryId)
        : '0'
    )
    setInvoiceType(initialValues.invoiceType ?? '')
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
  }, [canPickSubChannel, lockedSubChannelId, subChannelId])

  const { data: subChannels = [], isLoading: loadingSubChannels } = useQuery({
    queryKey: ['reports', 'outlet-reports', 'sub-channels'],
    enabled: canPickSubChannel,
    queryFn: async () => {
      const res = (await getAllSubChannel()) as ApiResponse<SubChannelDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: areas = [], isLoading: loadingAreas } = useQuery({
    queryKey: ['reports', 'outlet-reports', 'areas', effectiveSubChannelId || 'none'],
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
    data: territories = [],
    isLoading: loadingTerritories,
    isFetching: fetchingTerritories,
  } = useQuery({
    queryKey: ['reports', 'outlet-reports', 'territories', areaId || 'none'],
    enabled: Boolean(areaId) && areaId !== '0',
    queryFn: async () => {
      if (!areaId || areaId === '0') return []
      const res = (await getTerritoriesByAreaId(
        Number(areaId)
      )) as ApiResponse<TerritoryDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: routes = [],
    isLoading: loadingRoutes,
    isFetching: fetchingRoutes,
  } = useQuery({
    queryKey: ['reports', 'outlet-reports', 'routes', territoryId || 'none'],
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

  const { data: outletCategories = [], isLoading: loadingOutletCategories } =
    useQuery({
      queryKey: ['reports', 'outlet-reports', 'outlet-categories'],
      queryFn: async () => {
        const res =
          (await getAllOutletCategory()) as ApiResponse<OutletCategoryDTO[]>
        return res.payload ?? []
      },
      staleTime: 5 * 60 * 1000,
    })

  const handleApply = () => {
    const hasSubChannel = Boolean(effectiveSubChannelId)
    setErrors({
      subChannelId: !hasSubChannel,
    })
    if (!hasSubChannel) return

    onApply?.({
      subChannelId: effectiveSubChannelId
        ? Number(effectiveSubChannelId)
        : undefined,
      areaId: toNumberValue(areaId) ?? 0,
      territoryId: toNumberValue(territoryId) ?? 0,
      routeId: toNumberValue(routeId) ?? 0,
      outletCategoryId: toNumberValue(outletCategoryId) ?? 0,
      invoiceType: invoiceType ?? '',
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
    setOutletCategoryId('0')
    setInvoiceType('')
    setRange(undefined)
    setErrors({ subChannelId: false })
    onReset?.()
    onApply?.({
      subChannelId: resetSubChannelId ? Number(resetSubChannelId) : undefined,
      areaId: 0,
      territoryId: 0,
      routeId: 0,
      outletCategoryId: 0,
      invoiceType: '',
      startDate: undefined,
      endDate: undefined,
    })
  }

  return (
    <div className='flex flex-wrap items-end gap-2 lg:flex-nowrap'>
      <div className='flex w-full min-w-[180px] flex-1 flex-col gap-2 sm:min-w-[200px]'>
        <Select
          value={effectiveSubChannelId}
          onValueChange={(value) => {
            setSubChannelId(value)
            setAreaId('0')
            setTerritoryId('0')
            setRouteId('0')
            setErrors((prev) => ({ ...prev, subChannelId: false }))
          }}
          disabled={loadingSubChannels || !canPickSubChannel}
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
            {subChannels.map((subChannel) => (
              <SelectItem key={subChannel.id} value={String(subChannel.id)}>
                {subChannel.subChannelName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='flex w-full min-w-[140px] flex-1 flex-col gap-2 sm:min-w-[180px]'>
        <Select
          value={areaId}
          onValueChange={(value) => {
            setAreaId(value)
            setTerritoryId('0')
            setRouteId('0')
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
            {areas.map((area) => (
              <SelectItem key={area.id} value={String(area.id)}>
                {area.areaName ?? `Area ${area.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='flex w-full min-w-[140px] flex-1 flex-col gap-2 sm:min-w-[180px]'>
        <Select
          value={territoryId}
          onValueChange={(value) => {
            setTerritoryId(value)
            setRouteId('0')
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

      <div className='flex w-full min-w-[140px] flex-1 flex-col gap-2 sm:min-w-[180px]'>
        <Select
          value={routeId}
          onValueChange={(value) => setRouteId(value)}
          disabled={
            loadingRoutes || fetchingRoutes || !territoryId || territoryId === '0'
          }
        >
          <SelectTrigger
            className={cn(controlHeight, 'w-full bg-slate-50 text-left')}
          >
            <SelectValue placeholder='Select Route' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='0'>All Routes</SelectItem>
            {routes.map((route) => (
              <SelectItem key={route.id} value={String(route.id)}>
                {route.routeName ?? `Route ${route.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='flex w-full min-w-[160px] flex-1 flex-col gap-2 sm:min-w-[180px]'>
        <Select
          value={outletCategoryId}
          onValueChange={(value) => setOutletCategoryId(value)}
          disabled={loadingOutletCategories}
        >
          <SelectTrigger
            className={cn(controlHeight, 'w-full bg-slate-50 text-left')}
          >
            <SelectValue placeholder='Select Outlet Category' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='0'>All Categories</SelectItem>
            {outletCategories.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                {category.name ?? `Category ${category.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='flex w-full min-w-[160px] flex-1 flex-col gap-2 sm:min-w-[180px]'>
        <Select
          value={invoiceTypeValue}
          onValueChange={(value) => {
            setInvoiceType(
              value === 'ALL' ? '' : (value as ReportInvoiceTypeParam)
            )
          }}
        >
          <SelectTrigger
            className={cn(controlHeight, 'w-full bg-slate-50 text-left')}
          >
            <SelectValue placeholder='Select Invoice Type' />
          </SelectTrigger>
          <SelectContent>
            {invoiceTypeOptions.map((option) => (
              <SelectItem
                key={option.value || 'ALL'}
                value={option.value ?? 'ALL'}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='flex w-full min-w-[200px] flex-1 flex-col gap-2 sm:min-w-[220px]'>
        <div className='relative w-full'>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                className={cn(
                  controlHeight,
                  'w-full min-w-0 justify-between rounded-md border bg-slate-50 text-left font-normal'
                )}
              >
                <div className='flex items-center gap-2'>
                  <CalendarIcon className='h-4 w-4 opacity-70' />
                  <span className='truncate'>
                    {range?.from && range?.to
                      ? `${formatLocalDate(range.from)} ~ ${formatLocalDate(range.to)}`
                      : range?.from
                        ? formatLocalDate(range.from)
                        : 'Select date range'}
                  </span>
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
                    onClick={() => setRange(undefined)}
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
          size='sm'
          className={cn(controlHeight, 'w-full px-4 sm:w-auto')}
          onClick={handleApply}
        >
          Apply filters
        </Button>
        <Button
          variant='outline'
          size='sm'
          className={cn(controlHeight, 'w-full px-4 sm:w-auto')}
          onClick={handleReset}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}
