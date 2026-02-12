import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import {
  getAllOutletsByRouteId,
  getAllChannel,
  getAllSubChannel,
  getAllSubChannelsByChannelId,
  getAreasBySubChannelId,
  getTerritoriesByAreaId,
  getRoutesByTerritoryId,
  type ApiResponse,
  type AreaDTO,
  type ChannelDTO,
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
import type { InvoiceType } from '@/types/invoice'

export type TerritoryWiseItemsFilters = {
  subChannelId?: number
  areaId?: number
  territoryId?: number
  routeId?: number
  outletId?: number
  invoiceType?: InvoiceType
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

const isPresentCode = (value?: number | string | null) =>
  value !== null && value !== undefined && value !== ''

const invoiceTypeOptions: Array<{ label: string; value: InvoiceType }> = [
  { label: 'All Invoice Types', value: 'ALL' },
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Agency', value: 'AGENCY' },
  { label: 'Company', value: 'COMPANY' },
]

export default function TerritoryWiseItemsFilter({
  initialValues,
  onApply,
}: FilterProps) {
  const controlHeight = 'h-9 min-h-[36px]'
  const todayIso = useMemo(() => formatLocalDate(new Date()), [])
  const user = useAppSelector((state) => state.auth.user)
  type PersistedAuth = {
    areaNameList?: unknown
    channelId?: unknown
    channelName?: unknown
    subChannelId?: unknown
    subChannelName?: unknown
    territoryId?: unknown
    territoryName?: unknown
  }

  const persistedAuth = useMemo<PersistedAuth | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem('auth_user')
      return raw ? (JSON.parse(raw) as PersistedAuth) : null
    } catch {
      return null
    }
  }, [])
  const userAreas = useMemo<AreaDTO[] | null>(() => {
    const list = persistedAuth?.areaNameList
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
  }, [persistedAuth])
  const useUserAreas = Boolean(userAreas?.length)
  const lockedChannel = useMemo(() => {
    if (!persistedAuth) return null
    const channelId = persistedAuth.channelId
    const channelName =
      typeof persistedAuth.channelName === 'string'
        ? persistedAuth.channelName.trim()
        : ''
    if (!channelName) return null
    if (channelId === null || channelId === undefined) return null
    const normalizedId = String(channelId).trim()
    if (!normalizedId || normalizedId === '0') return null
    return { id: normalizedId, name: channelName }
  }, [persistedAuth])
  const lockedChannelId = lockedChannel?.id ?? ''
  const isChannelLocked = Boolean(lockedChannelId)
  const lockedAreaId = useMemo(() => {
    if (!userAreas || userAreas.length !== 1) return ''
    const only = userAreas[0]
    if (only?.id === undefined || only?.id === null) return ''
    const normalizedId = String(only.id).trim()
    if (!normalizedId) return ''
    return normalizedId
  }, [userAreas])
  const isAreaLocked = Boolean(lockedAreaId)
  const canPickSubChannel = useMemo(() => {
    const userTypeId = user?.userTypeId
    return userTypeId === 1 || userTypeId === 2 || userTypeId === 3
  }, [user?.userTypeId])
  const lockedSubChannel = useMemo(() => {
    if (!persistedAuth) return null
    const subChannelId = persistedAuth.subChannelId
    const subChannelName =
      typeof persistedAuth.subChannelName === 'string'
        ? persistedAuth.subChannelName.trim()
        : ''
    if (!subChannelName) return null
    if (subChannelId === null || subChannelId === undefined) return null
    const normalizedId = String(subChannelId).trim()
    if (!normalizedId || normalizedId === '0') return null
    return { id: normalizedId, name: subChannelName }
  }, [persistedAuth])
  const lockedSubChannelId = useMemo(() => {
    if (lockedSubChannel) return lockedSubChannel.id
    if (canPickSubChannel) return ''
    const value = user?.subChannelId
    return value !== undefined && value !== null ? String(value) : ''
  }, [lockedSubChannel, canPickSubChannel, user?.subChannelId])
  const isSubChannelLocked = Boolean(lockedSubChannelId)
  const lockedTerritoryId = useMemo(() => {
    if (!persistedAuth) return ''
    const territoryId = persistedAuth.territoryId
    if (territoryId === null || territoryId === undefined) return ''
    const normalizedId = String(territoryId).trim()
    if (!normalizedId || normalizedId === '0') return ''
    return normalizedId
  }, [persistedAuth])
  const isTerritoryLocked = Boolean(lockedTerritoryId)
  const [subChannelId, setSubChannelId] = useState<string>('')
  const [areaId, setAreaId] = useState<string>('0')
  const [territoryId, setTerritoryId] = useState<string>('0')
  const [routeId, setRouteId] = useState<string>('0')
  const [outletId, setOutletId] = useState<string>('0')
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('ALL')
  const [channelId, setChannelId] = useState<string>('0')
  const [range, setRange] = useState<DateRange | undefined>({
    from: parseDate(initialValues?.startDate ?? todayIso),
    to: parseDate(initialValues?.endDate ?? todayIso),
  })
  const [errors, setErrors] = useState({
    subChannelId: false,
  })
  const effectiveSubChannelId = isSubChannelLocked
    ? lockedSubChannelId
    : canPickSubChannel
      ? subChannelId
      : lockedSubChannelId

  useEffect(() => {
    if (!initialValues) {
      if (!canPickSubChannel) {
        setSubChannelId(lockedSubChannelId)
      }
      if (isSubChannelLocked) {
        setSubChannelId(lockedSubChannelId)
      }
      if (isChannelLocked) {
        setChannelId(lockedChannelId)
      }
      if (isAreaLocked) {
        setAreaId(lockedAreaId)
      }
      if (isTerritoryLocked) {
        setTerritoryId(lockedTerritoryId)
      }
      return
    }
    setSubChannelId(
      isSubChannelLocked
        ? lockedSubChannelId
        : canPickSubChannel
        ? initialValues.subChannelId !== undefined &&
            initialValues.subChannelId !== null
          ? String(initialValues.subChannelId)
          : ''
        : lockedSubChannelId
    )
    setAreaId(
      isAreaLocked
        ? lockedAreaId
        : initialValues.areaId !== undefined && initialValues.areaId !== null
        ? String(initialValues.areaId)
        : '0'
    )
    setTerritoryId(
      isTerritoryLocked
        ? lockedTerritoryId
        : initialValues.territoryId !== undefined &&
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
    setInvoiceType(initialValues.invoiceType ?? 'ALL')
    setRange({
      from: parseDate(initialValues.startDate ?? todayIso),
      to: parseDate(initialValues.endDate ?? todayIso),
    })
  }, [
    initialValues,
    todayIso,
    canPickSubChannel,
    lockedSubChannelId,
    isSubChannelLocked,
    isChannelLocked,
    lockedChannelId,
    isAreaLocked,
    lockedAreaId,
    isTerritoryLocked,
    lockedTerritoryId,
  ])

  useEffect(() => {
    if (canPickSubChannel) return
    if (!lockedSubChannelId) return
    if (subChannelId === lockedSubChannelId) return
    setSubChannelId(lockedSubChannelId)
    setAreaId(isAreaLocked ? lockedAreaId : '0')
    setTerritoryId(isTerritoryLocked ? lockedTerritoryId : '0')
    setRouteId('0')
    setOutletId('0')
  }, [
    canPickSubChannel,
    lockedSubChannelId,
    subChannelId,
    isAreaLocked,
    lockedAreaId,
    isTerritoryLocked,
    lockedTerritoryId,
  ])

  useEffect(() => {
    if (!isSubChannelLocked) return
    if (subChannelId === lockedSubChannelId) return
    setSubChannelId(lockedSubChannelId)
    setAreaId(isAreaLocked ? lockedAreaId : '0')
    setTerritoryId(isTerritoryLocked ? lockedTerritoryId : '0')
    setRouteId('0')
    setOutletId('0')
  }, [
    isSubChannelLocked,
    lockedSubChannelId,
    subChannelId,
    isAreaLocked,
    lockedAreaId,
    isTerritoryLocked,
    lockedTerritoryId,
  ])

  useEffect(() => {
    if (!isAreaLocked) return
    if (areaId === lockedAreaId) return
    setAreaId(lockedAreaId)
  }, [isAreaLocked, lockedAreaId, areaId])

  useEffect(() => {
    if (!isTerritoryLocked) return
    if (territoryId === lockedTerritoryId) return
    setTerritoryId(lockedTerritoryId)
  }, [isTerritoryLocked, lockedTerritoryId, territoryId])

  useEffect(() => {
    if (!useUserAreas) return
    if (isChannelLocked) return
    if (channelId === '0') return
    setChannelId('0')
  }, [useUserAreas, isChannelLocked, channelId])

  useEffect(() => {
    if (!isChannelLocked) return
    if (channelId === lockedChannelId) return
    setChannelId(lockedChannelId)
  }, [isChannelLocked, lockedChannelId, channelId])

  const { data: channels, isLoading: loadingChannels } = useQuery({
    queryKey: ['reports', 'channels'],
    enabled: canPickSubChannel && !useUserAreas,
    queryFn: async () => {
      const res = (await getAllChannel()) as ApiResponse<ChannelDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const channelOptions = useMemo(() => {
    if (!lockedChannel) return channels ?? []
    const list = channels ?? []
    const exists = list.some(
      (option) => String(option.id) === lockedChannel.id
    )
    if (exists) return list
    return [
      {
        id: lockedChannel.id,
        channelCode: lockedChannel.id,
        channelName: lockedChannel.name,
      } satisfies ChannelDTO,
      ...list,
    ]
  }, [channels, lockedChannel])

  const effectiveChannelId = isChannelLocked ? lockedChannelId : channelId
  const hasChannel = Boolean(effectiveChannelId) && effectiveChannelId !== '0'

  const { data: subChannels, isLoading: loadingSubChannels } = useQuery({
    queryKey: ['reports', 'sub-channels', hasChannel ? effectiveChannelId : 'all'],
    enabled: canPickSubChannel,
    queryFn: async () => {
      const res = (await (hasChannel
        ? getAllSubChannelsByChannelId(Number(effectiveChannelId))
        : getAllSubChannel())) as ApiResponse<SubChannelDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const subChannelOptions = useMemo(() => {
    if (!lockedSubChannel) return subChannels ?? []
    const list = subChannels ?? []
    const exists = list.some(
      (option) => String(option.id) === lockedSubChannel.id
    )
    if (exists) return list
    return [
      {
        id: lockedSubChannel.id,
        subChannelName: lockedSubChannel.name,
      } satisfies SubChannelDTO,
      ...list,
    ]
  }, [subChannels, lockedSubChannel])

  const { data: areas, isLoading: loadingAreas } = useQuery({
    queryKey: ['reports', 'areas', effectiveSubChannelId || 'none'],
    enabled: Boolean(effectiveSubChannelId) && !useUserAreas,
    queryFn: async () => {
      if (!effectiveSubChannelId) return []
      const res = (await getAreasBySubChannelId(
        Number(effectiveSubChannelId)
      )) as ApiResponse<AreaDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const areaOptions = useMemo(() => {
    const source = useUserAreas ? userAreas ?? [] : areas ?? []
    if (!source.length) return []
    const map = new Map<string, AreaDTO>()
    source.forEach((area) => {
      if (!area || area.id === undefined || area.id === null) return
      const key = String(area.id)
      const existing = map.get(key)
      if (!existing) {
        map.set(key, area)
        return
      }
      const existingName = existing.areaName?.trim()
      const nextName = area.areaName?.trim()
      if (!existingName && nextName) {
        map.set(key, { ...existing, areaName: nextName })
      }
    })
    return Array.from(map.values())
  }, [areas, userAreas, useUserAreas])
  const isAreaLoading = !useUserAreas && loadingAreas
  const isAreaSelectDisabled =
    isAreaLocked ||
    (!useUserAreas && (!effectiveSubChannelId || isAreaLoading))

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

  const territoryOptions = useMemo(() => {
    const source = territories ?? []
    const map = new Map<string, TerritoryDTO>()
    source.forEach((territory) => {
      if (!territory || territory.id === undefined || territory.id === null) return
      map.set(String(territory.id), territory)
    })
    if (isTerritoryLocked) {
      const exists = map.has(String(lockedTerritoryId))
      if (!exists) {
        const territoryName =
          typeof persistedAuth?.territoryName === 'string'
            ? persistedAuth.territoryName.trim()
            : ''
        map.set(String(lockedTerritoryId), {
          id: lockedTerritoryId,
          territoryName: territoryName || undefined,
        } satisfies TerritoryDTO)
      }
    }
    return Array.from(map.values())
  }, [territories, isTerritoryLocked, lockedTerritoryId, persistedAuth])

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
      invoiceType,
      startDate: toIsoDate(range?.from),
      endDate: toIsoDate(range?.to),
    })
  }

  const handleReset = () => {
    const resetSubChannelId = canPickSubChannel ? '' : lockedSubChannelId
    const resetAreaId = isAreaLocked ? lockedAreaId : '0'
    setChannelId(isChannelLocked ? lockedChannelId : '0')
    setSubChannelId(isSubChannelLocked ? lockedSubChannelId : resetSubChannelId)
    setAreaId(resetAreaId)
    setTerritoryId(isTerritoryLocked ? lockedTerritoryId : '0')
    setRouteId('0')
    setOutletId('0')
    setInvoiceType('ALL')
    setRange(undefined)
    setErrors({ subChannelId: false })
    onApply?.({
      subChannelId: isSubChannelLocked
        ? Number(lockedSubChannelId)
        : resetSubChannelId
          ? Number(resetSubChannelId)
          : undefined,
      areaId: resetAreaId ? Number(resetAreaId) : 0,
      territoryId: isTerritoryLocked ? Number(lockedTerritoryId) : 0,
      routeId: 0,
      outletId: 0,
      invoiceType: 'ALL',
      startDate: undefined,
      endDate: undefined,
    })
  }

  const handleClearDates = () => {
    setRange(undefined)
  }

  return (
    <div className='flex flex-wrap items-end gap-2'>
      {canPickSubChannel && !useUserAreas ? (
        <div className='flex w-full min-w-[180px] flex-1 flex-col gap-2 sm:min-w-[200px]'>
          <Select
            value={effectiveChannelId}
            onValueChange={(value) => {
              setChannelId(value)
              setSubChannelId('')
              setAreaId(isAreaLocked ? lockedAreaId : '0')
              setTerritoryId(isTerritoryLocked ? lockedTerritoryId : '0')
              setRouteId('0')
              setOutletId('0')
              setErrors((prev) => ({ ...prev, subChannelId: false }))
            }}
            disabled={loadingChannels || isChannelLocked}
          >
            <SelectTrigger className={cn(controlHeight, 'w-full bg-slate-50 text-left')}>
              <SelectValue placeholder='Select Channel' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='0'>All Channels</SelectItem>
              {channelOptions.map((channel) => (
                <SelectItem key={channel.id} value={String(channel.id)}>
                  {channel.channelName ?? channel.channelCode ?? channel.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {canPickSubChannel ? (
        <div className='flex w-full min-w-[180px] flex-1 flex-col gap-2 sm:min-w-[200px]'>
          <Select
            value={effectiveSubChannelId}
            onValueChange={(value) => {
              setSubChannelId(value)
              setAreaId(isAreaLocked ? lockedAreaId : '0')
              setTerritoryId(isTerritoryLocked ? lockedTerritoryId : '0')
              setRouteId('0')
              setOutletId('0')
              setErrors((prev) => ({ ...prev, subChannelId: false }))
            }}
            disabled={loadingSubChannels || isSubChannelLocked}
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
              {subChannelOptions.map((subChannel) => (
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

      <div className='flex w-full min-w-[140px] flex-1 flex-col gap-2 sm:min-w-[180px]'>
        <Select
          value={areaId}
          onValueChange={(value) => {
            setAreaId(value)
            setTerritoryId(isTerritoryLocked ? lockedTerritoryId : '')
            setRouteId('')
            setOutletId('')
          }}
          disabled={isAreaSelectDisabled}
        >
          <SelectTrigger
            className={cn(controlHeight, 'w-full bg-slate-50 text-left')}
          >
            <SelectValue placeholder='Select Area' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='0'>All Areas</SelectItem>
            {areaOptions?.map((area) => (
              <SelectItem key={area.id} value={String(area.id)}>
                {area.areaName}
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
            setRouteId('')
            setOutletId('')
          }}
          disabled={
            isTerritoryLocked ||
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
              {territoryOptions.map((territory) => (
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
            {routes?.map((route) => {
              const routeLabel = route.routeName ?? `Route ${route.id}`
              const routeCode = route.routeCode
              const routeTextValue = isPresentCode(routeCode)
                ? `${routeCode} ${routeLabel}`
                : routeLabel
              return (
                <SelectItem
                  key={route.id}
                  value={String(route.id)}
                  textValue={routeTextValue}
                >
                  <div className='flex w-full items-center gap-2'>
                    {isPresentCode(routeCode) ? (
                      <span className='shrink-0 rounded-sm bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
                        {routeCode}
                      </span>
                    ) : null}
                    <span className='truncate'>{routeLabel}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <div className='flex w-full min-w-[140px] flex-1 flex-col gap-2 sm:min-w-[180px]'>
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
            {outlets?.map((outlet) => {
              const outletRecord = outlet as OutletDTO & {
                shopCode?: number | string | null
                outletName?: string | null
              }
              const outletLabel =
                outletRecord.name ??
                outletRecord.outletName ??
                `Outlet ${outletRecord.id}`
              const shopCode = outletRecord.shopCode
              const outletTextValue = isPresentCode(shopCode)
                ? `${shopCode} ${outletLabel}`
                : outletLabel
              return (
                <SelectItem
                  key={outletRecord.id}
                  value={String(outletRecord.id)}
                  textValue={outletTextValue}
                >
                  <div className='flex w-full items-center gap-2'>
                    {isPresentCode(shopCode) ? (
                      <span className='shrink-0 rounded-sm bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
                        {shopCode}
                      </span>
                    ) : null}
                    <span className='truncate'>{outletLabel}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <div className='flex w-full min-w-[160px] flex-1 flex-col gap-2 sm:min-w-[180px]'>
        <Select
          value={invoiceType}
          onValueChange={(value) => setInvoiceType(value as InvoiceType)}
        >
          <SelectTrigger
            className={cn(controlHeight, 'w-full bg-slate-50 text-left')}
          >
            <SelectValue placeholder='Select Invoice Type' />
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

      <div className='flex w-full min-w-[200px] flex-1 flex-col gap-2 sm:min-w-[220px]'>
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
