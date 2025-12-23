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
  getAllArea,
  getTerritoriesByAreaId,
  getRoutesByTerritoryId,
} from '@/services/userDemarcation/endpoints'
import type { ApiResponse } from '@/types/common'
import type { AreaDTO, RouteDTO, TerritoryDTO } from '@/types/demarcation'


type OutletFilterValues = {
  areaId?: string
  territoryId?: string
  routeId?: string
  approvalStatus?: string
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
  const [area, setArea] = useState<string | undefined>(initialValues?.areaId)
  const [territory, setTerritory] = useState<string | undefined>(
    initialValues?.territoryId
  )
  const [route, setRoute] = useState<string | undefined>(initialValues?.routeId)

  const { data: areas = [], isLoading: isAreaLoading } = useQuery({
    queryKey: ['user-demarcation', 'areas'],
    queryFn: async () => {
      const res = (await getAllArea()) as ApiResponse<AreaDTO[]>
      return res.payload ?? []
    },
  })

  const { data: territories = [], isLoading: isTerritoryLoading } = useQuery({
    queryKey: ['user-demarcation', 'territories', area],
    enabled: !!area,
    queryFn: async () => {
      const res = (await getTerritoriesByAreaId(area!)) as ApiResponse<
        TerritoryDTO[]
      >
      return res.payload ?? []
    },
  })

  const { data: routes = [], isLoading: isRouteLoading } = useQuery({
    queryKey: ['user-demarcation', 'routes', territory],
    enabled: !!territory,
    queryFn: async () => {
      const res = (await getRoutesByTerritoryId(territory!)) as ApiResponse<
        RouteDTO[]
      >
      return res.payload ?? []
    },
  })

  const handleApply = () => {
    onApply?.({
      areaId: area,
      territoryId: territory,
      routeId: route,
    })
  }

  const handleReset = () => {
    setArea(undefined)
    setTerritory(undefined)
    setRoute(undefined)
    onReset?.()
    onApply?.({
      areaId: undefined,
      territoryId: undefined,
      routeId: undefined,
    })
  }

  return (
    <div className='rounded-sm border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900'>
      <div className='flex flex-wrap items-center gap-3 md:flex-nowrap'>
        <div className='flex w-[200px] flex-none flex-col gap-2'>
          <Select
            value={area}
            onValueChange={(value) => {
              setArea(value)
              setTerritory(undefined)
              setRoute(undefined)
            }}
          >
            <SelectTrigger className='h-11 w-full rounded-sm'>
              <SelectValue placeholder='Select Area' />
            </SelectTrigger>
            <SelectContent>
              {isAreaLoading ? (
                <SelectItem value='loading' disabled>
                  Loading...
                </SelectItem>
              ) : (
                areas.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.areaName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-[200px] flex-none flex-col gap-2'>
          <Select
            value={territory}
            onValueChange={(value) => {
              setTerritory(value)
              setRoute(undefined)
            }}
            disabled={!area}
          >
            <SelectTrigger className='h-11 w-full rounded-sm'>
              <SelectValue placeholder='Select Territory' />
            </SelectTrigger>
            <SelectContent>
              {isTerritoryLoading ? (
                <SelectItem value='loading' disabled>
                  Loading...
                </SelectItem>
              ) : (
                territories.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.territoryName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-[240px] flex-none flex-col gap-2'>
          <Select
            value={route}
            onValueChange={setRoute}
            disabled={!territory}
          >
            <SelectTrigger className='h-11 w-full rounded-sm'>
              <SelectValue placeholder='Select Route' />
            </SelectTrigger>
            <SelectContent>
              {isRouteLoading ? (
                <SelectItem value='loading' disabled>
                  Loading...
                </SelectItem>
              ) : (
                routes.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.routeName}
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
