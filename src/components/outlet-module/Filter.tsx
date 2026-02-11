import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getAllChannel,
  getAllSubChannelsByChannelId,
  getAreasBySubChannelId,
  getTerritoriesByAreaId,
  getRoutesByTerritoryId,
} from '@/services/userDemarcation/endpoints'
import type { ApiResponse } from '@/types/common'
import type {
  AreaDTO,
  ChannelDTO,
  RouteDTO,
  SubChannelDTO,
  TerritoryDTO,
} from '@/types/demarcation'

type OutletFilterValues = {
  channelId?: string
  subChannelId?: string
  areaId?: string
  territoryId?: string
  routeId?: string
}

type OutletFilterProps = {
  initialValues?: OutletFilterValues
  onApply?: (filters: OutletFilterValues) => void
  onReset?: () => void
}

export function OutletFilter({
  initialValues,
  onApply,
  onReset,
}: OutletFilterProps) {
  const persistedAuth = useMemo(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem('auth_user')
      return raw
        ? (JSON.parse(raw) as {
            channelId?: unknown
            channelName?: unknown
            subChannelId?: unknown
            subChannelName?: unknown
            territoryId?: unknown
          })
        : null
    } catch {
      return null
    }
  }, [])
  const lockedChannel = useMemo(() => {
    if (!persistedAuth) return null
    const channelId = persistedAuth?.channelId
    const channelName =
      typeof persistedAuth?.channelName === 'string'
        ? persistedAuth.channelName.trim()
        : ''
    if (!channelName) return null
    if (channelId === null || channelId === undefined) return null
    const normalizedId = String(channelId).trim()
    if (!normalizedId) return null
    return { id: normalizedId, name: channelName }
  }, [persistedAuth])
  const lockedSubChannel = useMemo(() => {
    if (!persistedAuth) return null
    const subChannelId = persistedAuth?.subChannelId
    const subChannelName =
      typeof persistedAuth?.subChannelName === 'string'
        ? persistedAuth.subChannelName.trim()
        : ''
    if (!subChannelName) return null
    if (subChannelId === null || subChannelId === undefined) return null
    const normalizedId = String(subChannelId).trim()
    if (!normalizedId) return null
    return { id: normalizedId, name: subChannelName }
  }, [persistedAuth])
  const lockedTerritoryId = useMemo(() => {
    if (!persistedAuth) return ''
    const territoryId = persistedAuth?.territoryId
    if (territoryId === null || territoryId === undefined) return ''
    const normalizedId = String(territoryId).trim()
    if (!normalizedId || normalizedId === '0') return ''
    return normalizedId
  }, [persistedAuth])
  const userAreas = useMemo<AreaDTO[] | null>(() => {
    const list = (persistedAuth as { areaNameList?: unknown })?.areaNameList
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
  const lockedAreaId = useMemo(() => {
    if (!userAreas || userAreas.length !== 1) return ''
    const only = userAreas[0]
    if (only?.id === undefined || only?.id === null) return ''
    const normalizedId = String(only.id).trim()
    if (!normalizedId) return ''
    return normalizedId
  }, [userAreas])
  const lockedChannelId = lockedChannel?.id ?? ''
  const isChannelLocked = Boolean(lockedChannelId)
  const lockedSubChannelId = lockedSubChannel?.id ?? ''
  const isSubChannelLocked = Boolean(lockedSubChannelId)
  const isTerritoryLocked = Boolean(lockedTerritoryId)
  const isAreaLocked = Boolean(lockedAreaId)
  const initialChannelId = lockedChannelId || initialValues?.channelId || ''
  const channelMismatch =
    isChannelLocked &&
    String(initialValues?.channelId ?? '').trim() !== lockedChannelId
  const subChannelMismatch =
    isSubChannelLocked &&
    String(initialValues?.subChannelId ?? '').trim() !== lockedSubChannelId
  const resetBelowSubChannel = channelMismatch || subChannelMismatch
  const initialSubChannelId =
    lockedSubChannelId ||
    (channelMismatch ? '0' : initialValues?.subChannelId || '0')
  const areaMismatch =
    isAreaLocked &&
    String(initialValues?.areaId ?? '').trim() !== lockedAreaId
  const resetBelowArea = resetBelowSubChannel || areaMismatch
  const initialAreaId =
    lockedAreaId || (resetBelowSubChannel ? '0' : initialValues?.areaId ?? '0')
  const territoryMismatch =
    isTerritoryLocked &&
    String(initialValues?.territoryId ?? '').trim() !== lockedTerritoryId
  const resetBelowTerritory = resetBelowArea || territoryMismatch
  const initialTerritoryId =
    lockedTerritoryId ||
    (resetBelowArea ? '0' : initialValues?.territoryId ?? '0')
  const [channel, setChannel] = useState<string>(
    initialChannelId
  )
  const [subChannelId, setSubChannelId] = useState<string>(
    initialSubChannelId
  )
  const [areaId, setAreaId] = useState<string>(
    initialAreaId
  )
  const [territoryId, setTerritoryId] = useState<string>(
    initialTerritoryId
  )
  const [routeId, setRouteId] = useState<string>(
    resetBelowTerritory ? '0' : (initialValues?.routeId ?? '0')
  )

  const hasChannel = Boolean(channel)
  const hasSubChannel = Boolean(subChannelId) && subChannelId !== '0'
  const hasArea = Boolean(areaId) && areaId !== '0'
  const hasTerritory = Boolean(territoryId) && territoryId !== '0'

  const { data: channels = [], isLoading: isChannelLoading } = useQuery({
    queryKey: ['user-demarcation', 'channels'],
    queryFn: async () => {
      const res = (await getAllChannel()) as ApiResponse<ChannelDTO[]>
      return res.payload ?? []
    },
  })
  const channelOptions = useMemo(() => {
    if (!lockedChannel) return channels
    const exists = channels.some(
      (option) => String(option.id) === lockedChannel.id
    )
    if (exists) return channels
    return [
      {
        id: lockedChannel.id,
        channelCode: lockedChannel.id,
        channelName: lockedChannel.name,
      } satisfies ChannelDTO,
      ...channels,
    ]
  }, [channels, lockedChannel])

  const { data: subChannels = [], isLoading: isSubChannelLoading } = useQuery({
    queryKey: ['user-demarcation', 'sub-channels', channel || 'none'],
    enabled: hasChannel,
    queryFn: async () => {
      if (!channel) return []
      const res = (await getAllSubChannelsByChannelId(
        Number(channel)
      )) as ApiResponse<SubChannelDTO[]>
      return res.payload ?? []
    },
  })
  const subChannelOptions = useMemo(() => {
    if (!lockedSubChannel) return subChannels
    const exists = subChannels.some(
      (option) => String(option.id) === lockedSubChannel.id
    )
    if (exists) return subChannels
    return [
      {
        id: lockedSubChannel.id,
        subChannelName: lockedSubChannel.name,
      } satisfies SubChannelDTO,
      ...subChannels,
    ]
  }, [subChannels, lockedSubChannel])

  const { data: apiAreas = [], isLoading: loadingApiAreas } = useQuery({
    queryKey: ['user-demarcation', 'areas', subChannelId || 'none'],
    enabled: hasSubChannel && !useUserAreas,
    queryFn: async () => {
      if (!hasSubChannel) return []
      const res = (await getAreasBySubChannelId(
        Number(subChannelId)
      )) as ApiResponse<AreaDTO[]>
      return res.payload ?? []
    },
  })
  const areaOptions = useMemo(
    () => (useUserAreas ? userAreas ?? [] : apiAreas),
    [apiAreas, userAreas, useUserAreas]
  )
  const isAreaLoading = !useUserAreas && loadingApiAreas
  const isAreaSelectDisabled =
    isAreaLocked || (!useUserAreas && (!hasSubChannel || isAreaLoading))

  const { data: territories = [], isLoading: isTerritoryLoading } = useQuery({
    queryKey: ['user-demarcation', 'territories', areaId || 'none'],
    enabled: hasArea,
    queryFn: async () => {
      if (!hasArea) return []
      const res = (await getTerritoriesByAreaId(
        Number(areaId)
      )) as ApiResponse<TerritoryDTO[]>
      return res.payload ?? []
    },
  })
  const territoryOptions = useMemo(() => {
    if (!lockedTerritoryId) return territories
    const exists = territories.some(
      (option) => String(option.id) === lockedTerritoryId
    )
    if (exists) return territories
    return [
      {
        id: lockedTerritoryId,
        territoryName: `Territory ${lockedTerritoryId}`,
      } satisfies TerritoryDTO,
      ...territories,
    ]
  }, [territories, lockedTerritoryId])
  const isTerritorySelectDisabled =
    isTerritoryLocked || !hasArea || isTerritoryLoading

  const { data: routes = [], isLoading: isRouteLoading } = useQuery({
    queryKey: ['user-demarcation', 'routes', territoryId || 'none'],
    enabled: hasTerritory,
    queryFn: async () => {
      if (!hasTerritory) return []
      const res = (await getRoutesByTerritoryId(
        Number(territoryId)
      )) as ApiResponse<RouteDTO[]>
      return res.payload ?? []
    },
  })

  const handleApply = () => {
    onApply?.({
      channelId: channel,
      subChannelId,
      areaId,
      territoryId,
      routeId,
    })
  }

  const handleReset = () => {
    setChannel(lockedChannelId || '')
    setSubChannelId(lockedSubChannelId || '0')
    setAreaId(lockedAreaId || '0')
    setTerritoryId(lockedTerritoryId || '0')
    setRouteId('0')
    onReset?.()
  }

  return (
    <div className='rounded-sm border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900'>
      <div className='flex flex-wrap items-center gap-3'>
        {!useUserAreas && (
          <div className='flex w-[220px] flex-none flex-col gap-2'>
            <Select
              value={channel}
              onValueChange={(value) => {
              setChannel(value)
              setSubChannelId(isSubChannelLocked ? lockedSubChannelId : '0')
              setAreaId(isAreaLocked ? lockedAreaId : '0')
              setTerritoryId(isTerritoryLocked ? lockedTerritoryId : '0')
              setRouteId('0')
            }}
            disabled={isChannelLocked || isChannelLoading}
            >
              <SelectTrigger className='h-11 w-full rounded-sm'>
                <SelectValue placeholder='Select Channel' />
              </SelectTrigger>
              <SelectContent>
                {channelOptions.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.channelName ??
                      option.channelCode ??
                      String(option.id)}
                  </SelectItem>
                ))}
                {isChannelLoading && (
                  <SelectItem value='loading' disabled>
                    Loading...
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className='flex w-[220px] flex-none flex-col gap-2'>
          <Select
            value={subChannelId}
            onValueChange={(value) => {
              setSubChannelId(value)
              setAreaId(isAreaLocked ? lockedAreaId : '0')
              setTerritoryId(isTerritoryLocked ? lockedTerritoryId : '0')
              setRouteId('0')
            }}
            disabled={isSubChannelLocked || !hasChannel || isSubChannelLoading}
          >
            <SelectTrigger className='h-11 w-full rounded-sm'>
              <SelectValue placeholder='Select Sub Channel' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='0'>All Sub Channels</SelectItem>
              {subChannelOptions.map((option) => (
                <SelectItem key={option.id} value={String(option.id)}>
                  {option.subChannelName ??
                    option.subChannelCode ??
                    String(option.id)}
                </SelectItem>
              ))}
              {isSubChannelLoading && (
                <SelectItem value='loading' disabled>
                  Loading...
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-[220px] flex-none flex-col gap-2'>
          <Select
            value={areaId}
            onValueChange={(value) => {
              setAreaId(value)
              setTerritoryId(isTerritoryLocked ? lockedTerritoryId : '0')
              setRouteId('0')
            }}
            disabled={isAreaSelectDisabled}
          >
            <SelectTrigger className='h-11 w-full rounded-sm'>
              <SelectValue placeholder='Select Area' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='0'>All Areas</SelectItem>
              {areaOptions.map((option) => (
                <SelectItem key={option.id} value={String(option.id)}>
                  {option.areaName ?? String(option.id)}
                </SelectItem>
              ))}
              {isAreaLoading && (
                <SelectItem value='loading' disabled>
                  Loading...
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-[220px] flex-none flex-col gap-2'>
          <Select
            value={territoryId}
            onValueChange={(value) => {
              setTerritoryId(value)
              setRouteId('0')
            }}
            disabled={isTerritorySelectDisabled}
          >
            <SelectTrigger className='h-11 w-full rounded-sm'>
              <SelectValue placeholder='Select Territory' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='0'>All Territories</SelectItem>
              {territoryOptions.map((option) => (
                <SelectItem key={option.id} value={String(option.id)}>
                  {option.territoryName ?? option.name ?? String(option.id)}
                </SelectItem>
              ))}
              {isTerritoryLoading && (
                <SelectItem value='loading' disabled>
                  Loading...
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-[220px] flex-none flex-col gap-2'>
          <Select
            value={routeId}
            onValueChange={setRouteId}
            disabled={!hasTerritory || isRouteLoading}
          >
            <SelectTrigger className='h-11 w-full rounded-sm'>
              <SelectValue placeholder='Select Route' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='0'>All Routes</SelectItem>
              {isRouteLoading ? (
                <SelectItem value='loading' disabled>
                  Loading...
                </SelectItem>
              ) : (
                routes.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.routeName ?? option.routeCode ?? String(option.id)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-none flex-wrap items-center gap-3 sm:flex-nowrap'>
          <Button className='h-9 rounded-sm px-6' onClick={handleApply}>
            Apply Filters
          </Button>
          <Button
            variant='outline'
            className='h-9 rounded-sm px-6'
            onClick={handleReset}
          >
            Reset All Filters
          </Button>
        </div>
      </div>
    </div>
  )
}
