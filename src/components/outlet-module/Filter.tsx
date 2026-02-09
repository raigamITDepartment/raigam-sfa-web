import { useState } from 'react'
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
  const [channel, setChannel] = useState<string>(
    initialValues?.channelId ?? ''
  )
  const [subChannelId, setSubChannelId] = useState<string>(
    initialValues?.subChannelId ?? '0'
  )
  const [areaId, setAreaId] = useState<string>(
    initialValues?.areaId ?? '0'
  )
  const [territoryId, setTerritoryId] = useState<string>(
    initialValues?.territoryId ?? '0'
  )
  const [routeId, setRouteId] = useState<string>(
    initialValues?.routeId ?? '0'
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

  const { data: areas = [], isLoading: isAreaLoading } = useQuery({
    queryKey: ['user-demarcation', 'areas', subChannelId || 'none'],
    enabled: hasSubChannel,
    queryFn: async () => {
      if (!hasSubChannel) return []
      const res = (await getAreasBySubChannelId(
        Number(subChannelId)
      )) as ApiResponse<AreaDTO[]>
      return res.payload ?? []
    },
  })

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
    setChannel('')
    setSubChannelId('0')
    setAreaId('0')
    setTerritoryId('0')
    setRouteId('0')
    onReset?.()
  }

  return (
    <div className='rounded-sm border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900'>
      <div className='flex flex-wrap items-center gap-3'>
        <div className='flex w-[220px] flex-none flex-col gap-2'>
          <Select
            value={channel}
            onValueChange={(value) => {
              setChannel(value)
              setSubChannelId('0')
              setAreaId('0')
              setTerritoryId('0')
              setRouteId('0')
            }}
          >
            <SelectTrigger className='h-11 w-full rounded-sm'>
              <SelectValue placeholder='Select Channel' />
            </SelectTrigger>
            <SelectContent>
              {isChannelLoading ? (
                <SelectItem value='loading' disabled>
                  Loading...
                </SelectItem>
              ) : (
                channels.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.channelName ??
                      option.channelCode ??
                      String(option.id)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-[220px] flex-none flex-col gap-2'>
          <Select
            value={subChannelId}
            onValueChange={(value) => {
              setSubChannelId(value)
              setAreaId('0')
              setTerritoryId('0')
              setRouteId('0')
            }}
            disabled={!hasChannel || isSubChannelLoading}
          >
            <SelectTrigger className='h-11 w-full rounded-sm'>
              <SelectValue placeholder='Select Sub Channel' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='0'>All Sub Channels</SelectItem>
              {isSubChannelLoading ? (
                <SelectItem value='loading' disabled>
                  Loading...
                </SelectItem>
              ) : (
                subChannels.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.subChannelName ??
                      option.subChannelCode ??
                      String(option.id)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-[220px] flex-none flex-col gap-2'>
          <Select
            value={areaId}
            onValueChange={(value) => {
              setAreaId(value)
              setTerritoryId('0')
              setRouteId('0')
            }}
            disabled={!hasSubChannel || isAreaLoading}
          >
            <SelectTrigger className='h-11 w-full rounded-sm'>
              <SelectValue placeholder='Select Area' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='0'>All Areas</SelectItem>
              {isAreaLoading ? (
                <SelectItem value='loading' disabled>
                  Loading...
                </SelectItem>
              ) : (
                areas.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.areaName ?? String(option.id)}
                  </SelectItem>
                ))
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
            disabled={!hasArea || isTerritoryLoading}
          >
            <SelectTrigger className='h-11 w-full rounded-sm'>
              <SelectValue placeholder='Select Territory' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='0'>All Territories</SelectItem>
              {isTerritoryLoading ? (
                <SelectItem value='loading' disabled>
                  Loading...
                </SelectItem>
              ) : (
                territories.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.territoryName ??
                      option.name ??
                      String(option.id)}
                  </SelectItem>
                ))
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
