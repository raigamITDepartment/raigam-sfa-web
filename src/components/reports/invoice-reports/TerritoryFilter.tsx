import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import {
  getAllChannel,
  getAllSubChannel,
  getAllSubChannelsByChannelId,
  getAreasBySubChannelId,
  getTerritoriesByAreaId,
  type ApiResponse,
  type AreaDTO,
  type ChannelDTO,
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
import type { InvoiceTypeParam, ReportInvoiceTypeParam } from '@/types/invoice'

export type InvoiceReportFilters = {
  subChannelId?: number
  areaId?: number
  territoryId?: number
  invoiceStatus?: 'BOOK' | 'ACTUAL' | 'CANCEL' | 'LATE'
  invoiceType?: ReportInvoiceTypeParam
  startDate?: string
  endDate?: string
}

type InvoiceReportFilterProps = {
  initialValues?: InvoiceReportFilters
  onApply?: (filters: InvoiceReportFilters) => void
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

const invoiceStatusOptions: Array<{
  label: string
  value: 'BOOK' | 'ACTUAL' | 'CANCEL' | 'LATE'
}> = [
  { label: 'Booked', value: 'BOOK' },
  { label: 'Actual', value: 'ACTUAL' },
  { label: 'Canceled', value: 'CANCEL' },
  { label: 'Late', value: 'LATE' },
]

const toInvoiceTypeValue = (value?: ReportInvoiceTypeParam) =>
  value ? (value as InvoiceTypeParam) : 'ALL'

export default function InvoiceReportFilter({
  initialValues,
  onApply,
  onReset,
}: InvoiceReportFilterProps) {
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
  const [areaId, setAreaId] = useState<string>('')
  const [territoryId, setTerritoryId] = useState<string>('')
  const [channelId, setChannelId] = useState<string>('0')
  const [invoiceStatus, setInvoiceStatus] = useState<
    'BOOK' | 'ACTUAL' | 'CANCEL' | 'LATE' | ''
  >('')
  const [invoiceType, setInvoiceType] = useState<InvoiceTypeParam>('ALL')
  const [range, setRange] = useState<DateRange | undefined>({
    from: parseDate(initialValues?.startDate ?? todayIso),
    to: parseDate(initialValues?.endDate ?? todayIso),
  })
  const [errors, setErrors] = useState({
    subChannelId: false,
    areaId: false,
    territoryId: false,
    invoiceStatus: false,
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
        : ''
    )
    setTerritoryId(
      isTerritoryLocked
        ? lockedTerritoryId
        : initialValues.territoryId !== undefined &&
            initialValues.territoryId !== null
          ? String(initialValues.territoryId)
          : ''
    )
    setInvoiceStatus(initialValues.invoiceStatus ?? '')
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
    setAreaId(isAreaLocked ? lockedAreaId : '')
    setTerritoryId(isTerritoryLocked ? lockedTerritoryId : '')
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
    setAreaId(isAreaLocked ? lockedAreaId : '')
    setTerritoryId(isTerritoryLocked ? lockedTerritoryId : '')
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

  const { data: channels = [], isLoading: loadingChannels } = useQuery({
    queryKey: ['reports', 'invoice-reports', 'channels'],
    enabled: canPickSubChannel && !useUserAreas,
    queryFn: async () => {
      const res = (await getAllChannel()) as ApiResponse<ChannelDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
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

  const effectiveChannelId = isChannelLocked ? lockedChannelId : channelId
  const hasChannel = Boolean(effectiveChannelId) && effectiveChannelId !== '0'

  const { data: subChannels = [], isLoading: loadingSubChannels } = useQuery({
    queryKey: [
      'reports',
      'invoice-reports',
      'sub-channels',
      hasChannel ? effectiveChannelId : 'all',
    ],
    queryFn: async () => {
      const res = (await (hasChannel
        ? getAllSubChannelsByChannelId(Number(effectiveChannelId))
        : getAllSubChannel())) as ApiResponse<SubChannelDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
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

  const { data: areas = [], isLoading: loadingAreas } = useQuery({
    queryKey: [
      'reports',
      'invoice-reports',
      'areas',
      effectiveSubChannelId || 'none',
    ],
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
    const source = useUserAreas ? userAreas ?? [] : areas
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
    data: territories = [],
    isLoading: loadingTerritories,
    isFetching: fetchingTerritories,
  } = useQuery({
    queryKey: ['reports', 'invoice-reports', 'territories', areaId || 'none'],
    enabled: Boolean(areaId),
    queryFn: async () => {
      if (!areaId) return []
      const res = (await getTerritoriesByAreaId(
        Number(areaId)
      )) as ApiResponse<TerritoryDTO[]>
      return res.payload ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const territoryOptions = useMemo(() => {
    if (!isTerritoryLocked) return territories
    const exists = territories.some(
      (option) => String(option.id) === lockedTerritoryId
    )
    if (exists) return territories
    const territoryName =
      typeof persistedAuth?.territoryName === 'string'
        ? persistedAuth.territoryName.trim()
        : ''
    return [
      {
        id: lockedTerritoryId,
        territoryName: territoryName || undefined,
      } satisfies TerritoryDTO,
      ...territories,
    ]
  }, [territories, isTerritoryLocked, lockedTerritoryId, persistedAuth])

  const handleApply = () => {
    const hasSubChannel = Boolean(effectiveSubChannelId)
    const hasArea = Boolean(areaId)
    const hasTerritory = Boolean(territoryId)
    const hasInvoiceStatus = Boolean(invoiceStatus)
    const nextErrors = {
      subChannelId: !hasSubChannel,
      areaId: !hasArea,
      territoryId: !hasTerritory,
      invoiceStatus: !hasInvoiceStatus,
    }
    setErrors(nextErrors)
    if (
      nextErrors.subChannelId ||
      nextErrors.areaId ||
      nextErrors.territoryId ||
      nextErrors.invoiceStatus
    ) {
      return
    }

    onApply?.({
      subChannelId: effectiveSubChannelId
        ? Number(effectiveSubChannelId)
        : undefined,
      areaId: toNumberValue(areaId),
      territoryId: toNumberValue(territoryId),
      invoiceStatus: invoiceStatus || undefined,
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
    const resetAreaId = isAreaLocked ? lockedAreaId : ''
    setChannelId(isChannelLocked ? lockedChannelId : '0')
    setSubChannelId(isSubChannelLocked ? lockedSubChannelId : resetSubChannelId)
    setAreaId(resetAreaId)
    setTerritoryId(isTerritoryLocked ? lockedTerritoryId : '')
    setInvoiceStatus('')
    setInvoiceType('ALL')
    setRange(undefined)
    setErrors({
      subChannelId: false,
      areaId: false,
      territoryId: false,
      invoiceStatus: false,
    })
    onReset?.()
    onApply?.({
      subChannelId: isSubChannelLocked
        ? Number(lockedSubChannelId)
        : resetSubChannelId
          ? Number(resetSubChannelId)
          : undefined,
      areaId: resetAreaId ? toNumberValue(resetAreaId) : undefined,
      territoryId: isTerritoryLocked
        ? toNumberValue(lockedTerritoryId)
        : undefined,
      invoiceStatus: undefined,
      invoiceType: '',
      startDate: undefined,
      endDate: undefined,
    })
  }

  return (
    <div className='flex flex-wrap items-end gap-2'>
      {canPickSubChannel && !useUserAreas ? (
        <div className='flex w-full flex-col gap-2 sm:min-w-[170px] sm:flex-1'>
          <Select
            value={effectiveChannelId}
            onValueChange={(value) => {
              setChannelId(value)
              setSubChannelId('')
              setAreaId(isAreaLocked ? lockedAreaId : '')
              setTerritoryId(isTerritoryLocked ? lockedTerritoryId : '')
              setErrors((prev) => ({
                ...prev,
                subChannelId: false,
                areaId: false,
                territoryId: false,
              }))
            }}
            disabled={loadingChannels || isChannelLocked}
          >
            <SelectTrigger
              id='invoice-report-channel'
              className={cn(controlHeight, 'w-full')}
            >
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

        <div className='flex w-full flex-col gap-2 sm:min-w-[170px] sm:flex-1'>
          <Select
            value={effectiveSubChannelId}
            onValueChange={(value) => {
              setSubChannelId(value)
              setAreaId(isAreaLocked ? lockedAreaId : '')
              setTerritoryId(isTerritoryLocked ? lockedTerritoryId : '')
              setErrors((prev) => ({
                ...prev,
                subChannelId: false,
                areaId: false,
                territoryId: false,
              }))
            }}
            disabled={
              loadingSubChannels || !canPickSubChannel || isSubChannelLocked
            }
          >
            <SelectTrigger
              id='invoice-report-sub-channel'
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
              {subChannelOptions.map((subChannel) => (
                <SelectItem key={subChannel.id} value={String(subChannel.id)}>
                  {subChannel.subChannelName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-full flex-col gap-2 sm:min-w-[170px] sm:flex-1'>
          <Select
            value={areaId}
            onValueChange={(value) => {
              setAreaId(value)
              setTerritoryId(isTerritoryLocked ? lockedTerritoryId : '')
              setErrors((prev) => ({
                ...prev,
                areaId: false,
                territoryId: false,
              }))
            }}
            disabled={isAreaSelectDisabled}
          >
            <SelectTrigger
              id='invoice-report-area'
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
              {areaOptions.map((area) => (
                <SelectItem key={area.id} value={String(area.id)}>
                  {area.areaName ?? `Area ${area.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-full flex-col gap-2 sm:min-w-[180px] sm:flex-1'>
          <Select
            value={territoryId}
            onValueChange={(value) => {
              setTerritoryId(value)
              setErrors((prev) => ({ ...prev, territoryId: false }))
            }}
            disabled={
              isTerritoryLocked ||
              !areaId ||
              loadingTerritories ||
              fetchingTerritories
            }
          >
            <SelectTrigger
              id='invoice-report-territory'
              className={cn(
                controlHeight,
                'w-full',
                errors.territoryId ? 'border-red-500 text-red-600' : ''
              )}
              aria-invalid={errors.territoryId}
            >
              <SelectValue placeholder='Select Territores' />
            </SelectTrigger>
            <SelectContent>
            {territoryOptions.map((territory, index) => (
              <SelectItem
                key={`${territory.id ?? 'territory'}-${index}`}
                value={String(territory.id)}
              >
                {territory.territoryName ??
                  territory.name ??
                  `Territory ${territory.id}`}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-full flex-col gap-2 sm:min-w-[180px] sm:flex-1'>
          <Select
            value={invoiceStatus}
            onValueChange={(value) => {
              setInvoiceStatus(
                value as 'BOOK' | 'ACTUAL' | 'CANCEL' | 'LATE' | ''
              )
              setErrors((prev) => ({ ...prev, invoiceStatus: false }))
            }}
          >
            <SelectTrigger
              id='invoice-report-status'
              className={cn(
                controlHeight,
                'w-full',
                errors.invoiceStatus ? 'border-red-500 text-red-600' : ''
              )}
              aria-invalid={errors.invoiceStatus}
            >
              <SelectValue placeholder='Select Invoice Status' />
            </SelectTrigger>
            <SelectContent>
              {invoiceStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-full flex-col gap-2 sm:min-w-[180px] sm:flex-1'>
          <Select
            value={invoiceType}
            onValueChange={(value) => setInvoiceType(value as InvoiceTypeParam)}
          >
            <SelectTrigger
              id='invoice-report-type'
              className={cn(controlHeight, 'w-full')}
            >
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

        <div className='flex w-full flex-col gap-2 sm:min-w-[240px] sm:flex-1'>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id='invoice-report-date-range'
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
  )
}
