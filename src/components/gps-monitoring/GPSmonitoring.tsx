import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from '@react-google-maps/api'
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Rabbit,
  Receipt,
  RotateCcw,
  Store,
  Turtle,
} from 'lucide-react'
import { CommonAlert } from '@/components/common-alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import InvoiceNumber from '@/components/InvoiceNumber'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import {
  GPSMonitoringFilter,
  type GPSMonitoringFilters,
} from '@/components/gps-monitoring/Filter'
import {
  getGpsMonitoringData,
  type ApiResponse,
} from '@/services/userDemarcationApi'
import { cn } from '@/lib/utils'

type AgentStatus = 'online' | 'idle' | 'offline'

type MockAgent = {
  id: string
  name: string
  area: string
  territory: string
  lastPing: string
  status: AgentStatus
  latitude: number
  longitude: number
  speedKmh: number
  batteryPercent: number
}

type GpsMonitoringRecord = {
  id?: number | string
  userId?: number | string
  latitude?: number | string | null
  longitude?: number | string | null
  lat?: number | string | null
  lng?: number | string | null
  isCheckIn?: boolean | null
  isCheckOut?: boolean | null
  batteryPercentage?: string | number | null
  invoiceNumber?: string | number | null
  outletName?: string | null
  time?: string | null
  createdAt?: string | null
  createdDate?: string | null
  createdDateTime?: string | null
  gpsTime?: string | null
  gpsDateTime?: string | null
  timestamp?: number | string | null
  [key: string]: unknown
}

type GpsRoutePoint = {
  lat: number
  lng: number
  time: string
  label?: string
  batteryPercentage?: string | number | null
  isCheckIn?: boolean
  isCheckOut?: boolean
  outletName?: string | null
  invoiceNumber?: string | number | null
}

type GpsSummaryRow = {
  key: string
  title: string
  lat: number
  lng: number
  batteryPercent: number | null
  timeKey: number
}

const REPLAY_INTERVAL_MS = 1400
const SPEED_OPTIONS = [0.25, 0.5, 1, 2]
const MARKER_ICON_URL = '/map_maker.png'
const LINE_COLOR = '#f40203'
const EARTH_RADIUS_KM = 6371
const MAX_WAYPOINTS = 20

const TIME_KEYS = [
  'time',
  'gpsTime',
  'gpsDateTime',
  'createdAt',
  'createdDate',
  'createdDateTime',
  'timestamp',
]

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

const normalizeTime24h = (value?: string) => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const plainMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (plainMatch) {
    const hours = Number(plainMatch[1])
    const minutes = Number(plainMatch[2])
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
  const ampmMatch = trimmed.match(
    /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/
  )
  if (!ampmMatch) return null
  const hoursRaw = Number(ampmMatch[1])
  const minutes = Number(ampmMatch[2])
  if (Number.isNaN(hoursRaw) || Number.isNaN(minutes)) return null
  if (hoursRaw < 1 || hoursRaw > 12 || minutes < 0 || minutes > 59) return null
  const isPm = ampmMatch[3].toLowerCase() === 'pm'
  const hours = (hoursRaw % 12) + (isPm ? 12 : 0)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const parseDateTime = (date?: string, time?: string) => {
  const normalizedTime = normalizeTime24h(time)
  if (!date || !normalizedTime) return null
  const normalized = `${normalizedTime}:00`
  const parsed = new Date(`${date}T${normalized}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const normalizeTimeValue = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const numeric = Number(trimmed)
    if (!Number.isNaN(numeric)) {
      const parsed = new Date(numeric)
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
    }
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }
  return null
}

const interpolateLatLng = (
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  ratio: number
) => ({
  lat: start.lat + (end.lat - start.lat) * ratio,
  lng: start.lng + (end.lng - start.lng) * ratio,
})

const getInterpolatedPosition = (
  path: { lat: number; lng: number }[],
  index: number
) => {
  if (!path.length) return null
  const maxIndex = Math.max(0, path.length - 1)
  const clamped = Math.min(Math.max(index, 0), maxIndex)
  const baseIndex = Math.floor(clamped)
  const nextIndex = Math.min(baseIndex + 1, maxIndex)
  if (baseIndex === nextIndex) return path[baseIndex]
  const ratio = clamped - baseIndex
  return interpolateLatLng(path[baseIndex], path[nextIndex], ratio)
}

const formatLatLng = (lat: number, lng: number) =>
  `${lat.toFixed(4)}, ${lng.toFixed(4)}`

const formatTimeLabel = (value?: string) => {
  if (!value) return '--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const formatBatteryLabel = (value: number | null) =>
  value === null ? '—' : `${value}%`

const parseBatteryPercent = (value?: string | number | null) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value) : null
  }
  const trimmed = value.trim()
  if (!trimmed) return null
  const normalized = trimmed.replace('%', '')
  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? null : Math.round(parsed)
}

const buildAddressKey = (lat: number, lng: number) =>
  `${lat.toFixed(4)},${lng.toFixed(4)}`

const resolveRecordTime = (record: GpsMonitoringRecord, fallback: string) => {
  for (const key of TIME_KEYS) {
    const normalized = normalizeTimeValue(record[key])
    if (normalized) return normalized
  }
  return fallback
}

const buildPointLabel = (record: GpsMonitoringRecord) => {
  const parts: string[] = []
  if (record.outletName) {
    parts.push(String(record.outletName))
  }
  if (record.invoiceNumber !== null && record.invoiceNumber !== undefined) {
    const trimmed = String(record.invoiceNumber).trim()
    if (trimmed) {
      parts.push(`Invoice ${trimmed}`)
    }
  }
  if (record.isCheckIn) parts.push('Check-in')
  if (record.isCheckOut) parts.push('Check-out')
  return parts.length ? parts.join(' • ') : undefined
}

const CITY_TYPE_PRIORITY = [
  'locality',
  'postal_town',
  'administrative_area_level_2',
  'administrative_area_level_1',
  'sublocality_level_1',
  'sublocality',
  'neighborhood',
]

const pickCityLabel = (results: any[]) => {
  for (const result of results ?? []) {
    for (const component of result.address_components ?? []) {
      const types = component.types ?? []
      if (CITY_TYPE_PRIORITY.some((type) => types.includes(type))) {
        return component.long_name as string
      }
    }
  }
  return results?.[0]?.formatted_address ?? null
}

const mockAgents: MockAgent[] = [
  {
    id: 'SR-1042',
    name: 'A. Silva',
    area: 'Colombo',
    territory: 'Colombo North',
    lastPing: '2 min ago',
    status: 'online',
    latitude: 6.9271,
    longitude: 79.8612,
    speedKmh: 32,
    batteryPercent: 78,
  },
]

const statusBadgeClass: Record<AgentStatus, string> = {
  online:
    'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200',
  idle:
    'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200',
  offline:
    'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
}

export const GPSMonitoring = () => {
  const [appliedFilters, setAppliedFilters] =
    useState<GPSMonitoringFilters | null>(null)
  const [filterError, setFilterError] = useState<string | null>(null)
  const [playhead, setPlayhead] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [speedIndex, setSpeedIndex] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [outletDialogOpen, setOutletDialogOpen] = useState(false)
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [addressLookup, setAddressLookup] = useState<Record<string, string>>({})
  const [directionsPath, setDirectionsPath] = useState<
    { lat: number; lng: number }[] | null
  >(null)
  const [directionsError, setDirectionsError] = useState<string | null>(null)
  const [geocodeLabel, setGeocodeLabel] = useState<string | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const mapWrapperRef = useRef<HTMLDivElement | null>(null)
  const playheadRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const lastFrameRef = useRef<number | null>(null)
  const speedMultiplier = SPEED_OPTIONS[speedIndex] ?? 1
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as
    | string
    | undefined
  const queryParams = useMemo(() => {
    if (!appliedFilters?.salesRepId || !appliedFilters.trackingDate) {
      return null
    }
    const startTime = normalizeTime24h(appliedFilters.fromTime)
    const endTime = normalizeTime24h(appliedFilters.toTime)
    if (!startTime || !endTime) return null
    return {
      userId: appliedFilters.salesRepId,
      date: appliedFilters.trackingDate,
      startTime,
      endTime,
    }
  }, [appliedFilters])
  const {
    data: gpsRecords = [],
    isLoading: loadingGpsData,
    isFetching: fetchingGpsData,
    isError: gpsDataError,
    error: gpsDataErrorDetails,
  } = useQuery({
    queryKey: ['gps-monitoring', 'data', queryParams],
    enabled: Boolean(queryParams),
    queryFn: async () => {
      const res = (await getGpsMonitoringData(
        queryParams!
      )) as ApiResponse<GpsMonitoringRecord[]>
      return res.payload ?? []
    },
  })
  const routeData = useMemo<GpsRoutePoint[]>(() => {
    if (!gpsRecords.length) return []
    const start = parseDateTime(
      appliedFilters?.trackingDate,
      appliedFilters?.fromTime
    )
    const end = parseDateTime(
      appliedFilters?.trackingDate,
      appliedFilters?.toTime
    )
    const startMs = start?.getTime()
    const endMs = end?.getTime()
    const stepMs =
      startMs && endMs && endMs > startMs && gpsRecords.length > 1
        ? (endMs - startMs) / (gpsRecords.length - 1)
        : 60_000
    const fallbackStart = startMs ?? Date.now()

    return gpsRecords.reduce<GpsRoutePoint[]>((acc, record, index) => {
      const lat = toNumber(record.latitude ?? record.lat)
      const lng = toNumber(record.longitude ?? record.lng)
      if (lat === null || lng === null) return acc
      const fallbackTime = new Date(
        fallbackStart + index * stepMs
      ).toISOString()
      const time = resolveRecordTime(record, fallbackTime)
      const label = buildPointLabel(record)
      const isCheckIn =
        typeof record.isCheckIn === 'boolean'
          ? record.isCheckIn
          : undefined
      const isCheckOut =
        typeof record.isCheckOut === 'boolean'
          ? record.isCheckOut
          : undefined
      const batteryPercentage =
        typeof record.batteryPercentage === 'string' ||
        typeof record.batteryPercentage === 'number'
          ? record.batteryPercentage
          : undefined
      const outletName =
        typeof record.outletName === 'string' ? record.outletName : null
      const invoiceNumber =
        typeof record.invoiceNumber === 'string' ||
        typeof record.invoiceNumber === 'number'
          ? record.invoiceNumber
          : null
      acc.push({
        lat,
        lng,
        time,
        label,
        batteryPercentage,
        isCheckIn,
        isCheckOut,
        outletName,
        invoiceNumber,
      })
      return acc
    }, [])
  }, [gpsRecords, appliedFilters])

  useEffect(() => {
    playheadRef.current = playhead
  }, [playhead])

  const routeIndex = Math.min(
    Math.floor(playhead),
    Math.max(routeData.length - 1, 0)
  )

  const currentStatus = useMemo<AgentStatus>(() => {
    const point = routeData[routeIndex]
    if (point?.isCheckOut) return 'offline'
    if (point?.isCheckIn) return 'online'
    return 'idle'
  }, [routeData, routeIndex])
  const activeAgent = useMemo(() => {
    if (!routeData.length) return null
    const fallback = mockAgents[0]
    if (!fallback) return null
    return {
      ...fallback,
      id: appliedFilters?.salesRepId
        ? `SR-${appliedFilters.salesRepId}`
        : fallback.id,
      name: appliedFilters?.salesRepLabel ?? fallback.name,
      area: appliedFilters?.areaLabel ?? fallback.area,
      territory: appliedFilters?.territoryLabel ?? fallback.territory,
      status: currentStatus,
    }
  }, [
    appliedFilters?.salesRepId,
    appliedFilters?.salesRepLabel,
    appliedFilters?.areaLabel,
    appliedFilters?.territoryLabel,
    currentStatus,
    routeData.length,
  ])
  const lastPingLabel = useMemo(() => {
    const time = routeData[routeIndex]?.time
    if (!time) return activeAgent?.lastPing ?? '—'
    const parsed = new Date(time)
    if (Number.isNaN(parsed.getTime())) {
      return activeAgent?.lastPing ?? '—'
    }
    return formatDistanceToNow(parsed, { addSuffix: true })
  }, [routeData, routeIndex, activeAgent?.lastPing])
  const batteryEstimates = useMemo(() => {
    const raw = routeData.map((point) =>
      parseBatteryPercent(point.batteryPercentage)
    )
    const prevValues: Array<number | null> = new Array(raw.length).fill(null)
    let lastKnown: number | null = null
    for (let i = 0; i < raw.length; i += 1) {
      if (raw[i] !== null) lastKnown = raw[i]
      prevValues[i] = lastKnown
    }
    const nextValues: Array<number | null> = new Array(raw.length).fill(null)
    let nextKnown: number | null = null
    for (let i = raw.length - 1; i >= 0; i -= 1) {
      if (raw[i] !== null) nextKnown = raw[i]
      nextValues[i] = nextKnown
    }
    return raw.map((value, index) => {
      if (value !== null) return value
      const prevVal = prevValues[index]
      const nextVal = nextValues[index]
      if (prevVal !== null && nextVal !== null) {
        return Math.round((prevVal + nextVal) / 2)
      }
      return prevVal ?? nextVal ?? null
    })
  }, [routeData])
  const { outletRows, invoiceRows } = useMemo(() => {
    const outlets = new Map<string, GpsSummaryRow>()
    const invoices = new Map<string, GpsSummaryRow>()
    for (let index = 0; index < routeData.length; index += 1) {
      const point = routeData[index]
      const parsedTime = Date.parse(point.time)
      const timeKey = Number.isNaN(parsedTime) ? index : parsedTime
      if (point.outletName) {
        const trimmed = point.outletName.trim()
        if (trimmed) {
          const existing = outlets.get(trimmed)
          if (!existing || timeKey >= existing.timeKey) {
            outlets.set(trimmed, {
              key: trimmed,
              title: trimmed,
              lat: point.lat,
              lng: point.lng,
              batteryPercent: batteryEstimates[index] ?? null,
              timeKey,
            })
          }
        }
      }
      if (
        point.invoiceNumber !== null &&
        point.invoiceNumber !== undefined
      ) {
        const trimmed = String(point.invoiceNumber).trim()
        if (trimmed) {
          const existing = invoices.get(trimmed)
          if (!existing || timeKey >= existing.timeKey) {
            invoices.set(trimmed, {
              key: trimmed,
              title: trimmed,
              lat: point.lat,
              lng: point.lng,
              batteryPercent: batteryEstimates[index] ?? null,
              timeKey,
            })
          }
        }
      }
    }
    return {
      outletRows: Array.from(outlets.values()),
      invoiceRows: Array.from(invoices.values()),
    }
  }, [batteryEstimates, routeData])
  const outletCount = outletRows.length
  const invoiceCount = invoiceRows.length
  const routeBattery = parseBatteryPercent(
    routeData[routeIndex]?.batteryPercentage
  )
  const agentBattery = parseBatteryPercent(activeAgent?.batteryPercent)
  const batteryPercentRaw = routeBattery ?? agentBattery ?? 0
  const batteryPercent = Math.min(
    100,
    Math.max(0, Math.round(batteryPercentRaw))
  )
  const batteryTone =
    batteryPercent >= 65
      ? 'good'
      : batteryPercent >= 35
        ? 'warn'
        : 'low'
  const isGpsLoading = loadingGpsData || fetchingGpsData
  const canFetchGpsData = Boolean(queryParams)
  const hasGpsData = routeData.length > 0
  const gpsErrorMessage = gpsDataError
    ? gpsDataErrorDetails instanceof Error
      ? gpsDataErrorDetails.message
      : 'Failed to load GPS data.'
    : null
  const gpsStatusMessage = gpsErrorMessage
    ? 'Unable to load GPS data.'
    : isGpsLoading
      ? 'Loading GPS data...'
      : hasGpsData
        ? 'Live GPS signals and device trails.'
        : canFetchGpsData
          ? 'No GPS data for the selected filters.'
          : 'Apply filters to load GPS data.'
  const showNoDataAlert =
    canFetchGpsData && !isGpsLoading && !gpsErrorMessage && !hasGpsData

  useEffect(() => {
    if (!import.meta.env.DEV) return
    console.log('Points:', routeData.length)
    console.log('First:', routeData[0])
    console.log('Last:', routeData[routeData.length - 1])
  }, [routeData])

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'gps-monitoring-map',
    googleMapsApiKey: apiKey ?? '',
  })

  const routePath = useMemo(
    () => routeData.map((point) => ({ lat: point.lat, lng: point.lng })),
    [routeData]
  )
  const addressCacheRef = useRef(new Map<string, string>())
  const directionsWaypoints = useMemo(() => {
    if (routePath.length <= 2) return []
    const raw = routePath.slice(1, -1)
    if (raw.length <= MAX_WAYPOINTS) {
      return raw.map((point) => ({ location: point, stopover: false }))
    }
    const step = Math.ceil(raw.length / MAX_WAYPOINTS)
    return raw
      .filter((_, idx) => idx % step === 0)
      .map((point) => ({ location: point, stopover: false }))
  }, [routePath])
  const snappedPath = directionsPath ?? routePath
  const routeProgress = Math.max(1, routePath.length - 1)
  const clampedPlayhead = Math.min(playhead, routeProgress)
  const snappedMaxIndex = Math.max(0, snappedPath.length - 1)
  const snappedIndexFloat =
    snappedMaxIndex > 0
      ? (clampedPlayhead / routeProgress) * snappedMaxIndex
      : 0
  const displayPath = useMemo(() => {
    if (!snappedPath.length) return []
    const baseIndex = Math.floor(snappedIndexFloat)
    const basePath = snappedPath.slice(0, baseIndex + 1)
    if (baseIndex >= snappedPath.length - 1) return basePath
    const ratio = snappedIndexFloat - baseIndex
    if (ratio <= 0) return basePath
    const interpolated = interpolateLatLng(
      snappedPath[baseIndex],
      snappedPath[baseIndex + 1],
      ratio
    )
    return [...basePath, interpolated]
  }, [snappedPath, snappedIndexFloat])
  const mapCenter = snappedPath[0] ?? { lat: 6.9271, lng: 79.8612 }
  const markerPosition =
    getInterpolatedPosition(snappedPath, snappedIndexFloat) ?? mapCenter
  const playheadPercent =
    routeProgress > 0 ? (clampedPlayhead / routeProgress) * 100 : 0
  const playheadTimeLabel = formatTimeLabel(routeData[routeIndex]?.time)
  const currentLocationLabel =
    geocodeLabel ??
    routeData[routeIndex]?.label ??
    activeAgent?.area ??
    'Current location'
  const speedKmh = useMemo(() => {
    const prevIndex = Math.max(0, routeIndex - 1)
    const prevPoint = routeData[prevIndex]
    const currPoint = routeData[routeIndex]
    if (!prevPoint || !currPoint) return 0
    const startMs = Date.parse(prevPoint.time)
    const endMs = Date.parse(currPoint.time)
    const diffHours = Math.max(0.0001, (endMs - startMs) / 3_600_000)
    const lat1 = (prevPoint.lat * Math.PI) / 180
    const lat2 = (currPoint.lat * Math.PI) / 180
    const dLat = ((currPoint.lat - prevPoint.lat) * Math.PI) / 180
    const dLng = ((currPoint.lng - prevPoint.lng) * Math.PI) / 180
    const sinLat = Math.sin(dLat / 2)
    const sinLng = Math.sin(dLng / 2)
    const a =
      sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distanceKm = EARTH_RADIUS_KM * c
    return distanceKm / diffHours
  }, [routeData, routeIndex])
  const totalDistanceKm = useMemo(() => {
    if (displayPath.length < 2) return 0
    let total = 0
    for (let i = 1; i < displayPath.length; i += 1) {
      const prev = displayPath[i - 1]
      const curr = displayPath[i]
      const lat1 = (prev.lat * Math.PI) / 180
      const lat2 = (curr.lat * Math.PI) / 180
      const dLat = ((curr.lat - prev.lat) * Math.PI) / 180
      const dLng = ((curr.lng - prev.lng) * Math.PI) / 180
      const sinLat = Math.sin(dLat / 2)
      const sinLng = Math.sin(dLng / 2)
      const a =
        sinLat * sinLat +
        Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      total += EARTH_RADIUS_KM * c
    }
    return total
  }, [displayPath])

  const markerIcon = useMemo(() => {
    const googleMaps = (window as any).google
    if (!isLoaded || !googleMaps?.maps) return undefined
    return {
      url: MARKER_ICON_URL,
      scaledSize: new googleMaps.maps.Size(40, 40),
      anchor: new googleMaps.maps.Point(20, 40),
    }
  }, [isLoaded])
  const pointMarkerIcon = useMemo(() => {
    const googleMaps = (window as any).google
    if (!isLoaded || !googleMaps?.maps?.SymbolPath) return undefined
    return {
      path: googleMaps.maps.SymbolPath.CIRCLE,
      scale: 4,
      fillColor: '#2563eb',
      fillOpacity: 0.8,
      strokeColor: '#ffffff',
      strokeOpacity: 0.9,
      strokeWeight: 1.2,
    }
  }, [isLoaded])
  const geocodeCacheRef = useRef(new Map<string, string>())
  const lastGeocodeRef = useRef(0)

  useEffect(() => {
    playheadRef.current = 0
    setPlayhead(0)
  }, [routePath])

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !markerPosition) return
    map.panTo(markerPosition)
  }, [markerPosition])

  const toggleFullscreen = () => {
    const wrapper = mapWrapperRef.current
    if (!wrapper) return
    if (!document.fullscreenElement) {
      wrapper.requestFullscreen?.()
      return
    }
    document.exitFullscreen?.()
  }

  useEffect(() => {
    if (!isLoaded) return
    const googleMaps = (window as any).google
    if (!googleMaps?.maps?.Geocoder) return
    const lat = markerPosition.lat
    const lng = markerPosition.lng
    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`
    const cached = geocodeCacheRef.current.get(cacheKey)
    if (cached) {
      setGeocodeLabel(cached)
      return
    }
    const now = Date.now()
    if (now - lastGeocodeRef.current < 4000) return
    lastGeocodeRef.current = now
    const geocoder = new googleMaps.maps.Geocoder()
    geocoder.geocode(
      { location: { lat, lng } },
      (results: any[], status: string) => {
        if (status !== 'OK' || !results?.length) return
        const label = pickCityLabel(results)
        if (!label) return
        geocodeCacheRef.current.set(cacheKey, label)
        setGeocodeLabel(label)
      }
    )
  }, [isLoaded, markerPosition.lat, markerPosition.lng])

  useEffect(() => {
    if (!isLoaded || (!outletDialogOpen && !invoiceDialogOpen)) return
    const googleMaps = (window as any).google
    if (!googleMaps?.maps?.Geocoder) return
    const rows = [...outletRows, ...invoiceRows]
    const pending = rows
      .map((row) => ({
        key: buildAddressKey(row.lat, row.lng),
        lat: row.lat,
        lng: row.lng,
      }))
      .filter((entry) => !addressCacheRef.current.has(entry.key))
    if (!pending.length) return
    let cancelled = false
    const geocoder = new googleMaps.maps.Geocoder()
    const lookupNext = (index: number) => {
      if (cancelled || index >= pending.length) return
      const entry = pending[index]
      geocoder.geocode(
        { location: { lat: entry.lat, lng: entry.lng } },
        (results: any[], status: string) => {
          if (!cancelled && status === 'OK' && results?.length) {
            const address = pickCityLabel(results)
            if (address) {
              addressCacheRef.current.set(entry.key, address)
              setAddressLookup((prev) =>
                prev[entry.key] ? prev : { ...prev, [entry.key]: address }
              )
            }
          }
          window.setTimeout(() => lookupNext(index + 1), 200)
        }
      )
    }
    lookupNext(0)
    return () => {
      cancelled = true
    }
  }, [invoiceDialogOpen, isLoaded, outletDialogOpen, outletRows, invoiceRows])

  useEffect(() => {
    if (!isLoaded || routePath.length < 2) {
      setDirectionsPath(null)
      return
    }
    const googleMaps = (window as any).google
    if (!googleMaps?.maps?.DirectionsService) return
    const service = new googleMaps.maps.DirectionsService()
    service.route(
      {
        origin: routePath[0],
        destination: routePath[routePath.length - 1],
        waypoints: directionsWaypoints,
        travelMode: googleMaps.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      },
      (result: any, status: string) => {
        if (status === 'OK' && result?.routes?.length) {
          const overviewPath = result.routes[0]?.overview_path ?? []
          setDirectionsPath(
            overviewPath.map((point: any) => ({
              lat: point.lat(),
              lng: point.lng(),
            }))
          )
          setDirectionsError(null)
          return
        }
        setDirectionsPath(null)
        setDirectionsError(status)
      }
    )
  }, [isLoaded, routePath, directionsWaypoints])

  useEffect(() => {
    if (!isPlaying || routePath.length < 2) return
    if (playheadRef.current >= routePath.length - 1) return
    const stepMs = Math.max(80, REPLAY_INTERVAL_MS / speedMultiplier)
    const tick = (timestamp: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = timestamp
      }
      const delta = timestamp - lastFrameRef.current
      lastFrameRef.current = timestamp
      const next = Math.min(
        playheadRef.current + delta / stepMs,
        routePath.length - 1
      )
      if (next !== playheadRef.current) {
        playheadRef.current = next
        setPlayhead(next)
      }
      if (next < routePath.length - 1) {
        rafRef.current = window.requestAnimationFrame(tick)
      }
    }
    rafRef.current = window.requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      lastFrameRef.current = null
    }
  }, [isPlaying, routePath.length, speedMultiplier])

  return (
    <div className='space-y-4'>
      <GPSMonitoringFilter
        initialValues={appliedFilters ?? undefined}
        onApply={(filters) => {
          setAppliedFilters(filters)
          if (
            !filters.salesRepId ||
            !filters.trackingDate ||
            !filters.fromTime ||
            !filters.toTime
          ) {
            setFilterError(
              'Select a sales rep, tracking date, and time range to load GPS data.'
            )
            return
          }
          setFilterError(null)
        }}
        onReset={() => {
          setAppliedFilters(null)
          setFilterError(null)
        }}
      />
      <Card>
        <CardContent className='px-4 space-y-4'>
          <div className='rounded-md border bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <p className='text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300'>
                  Live Map
                </p>
                <p className='text-sm text-slate-700 dark:text-slate-200'>
                  {gpsStatusMessage}
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  size='icon'
                  variant='outline'
                  className='h-8 w-8'
                  onClick={() => setIsPlaying((prev) => !prev)}
                  aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
                >
                  {isPlaying ? (
                    <Pause className='h-4 w-4' />
                  ) : (
                    <Play className='h-4 w-4' />
                  )}
                </Button>
                <Button
                  size='icon'
                  variant='outline'
                  className='h-8 w-8'
                  onClick={() => {
                    playheadRef.current = 0
                    setPlayhead(0)
                    setIsPlaying(true)
                  }}
                  aria-label='Replay route'
                >
                  <RotateCcw className='h-4 w-4' />
                </Button>
                <div className='flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-900/60'>
                  <Turtle className='h-4 w-4 text-slate-500' />
                  <Slider
                    min={0}
                    max={SPEED_OPTIONS.length - 1}
                    step={1}
                    value={[speedIndex]}
                    onValueChange={(value) =>
                      setSpeedIndex(value[0] ?? speedIndex)
                    }
                    className='w-44'
                    aria-label='Replay speed'
                  />
                  <Rabbit className='h-4 w-4 text-slate-500' />
                </div>
              </div>
            </div>
            {filterError ? (
              <CommonAlert
                variant='warning'
                title='Filters required'
                description={filterError}
                className='mt-3'
              />
            ) : gpsErrorMessage ? (
              <CommonAlert
                variant='error'
                title='GPS data error'
                description={gpsErrorMessage}
                className='mt-3'
              />
            ) : showNoDataAlert ? (
              <CommonAlert
                variant='info'
                title='No GPS data'
                description='No GPS data found for the selected filters.'
                className='mt-3'
              />
            ) : null}

            <div className='mt-4 overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'>
              {!apiKey ? (
                <div className='flex h-56 items-center justify-center text-xs text-slate-500 dark:text-slate-400'>
                  Set `VITE_GOOGLE_MAPS_API_KEY` to render the live map.
                </div>
              ) : loadError ? (
                <div className='flex h-56 items-center justify-center text-xs text-slate-500 dark:text-slate-400'>
                  Failed to load map.
                </div>
              ) : !isLoaded ? (
                <div className='flex h-56 items-center justify-center text-xs text-slate-500 dark:text-slate-400'>
                  Loading map...
                </div>
              ) : directionsError ? (
                <div className='flex h-56 items-center justify-center text-xs text-slate-500 dark:text-slate-400'>
                  Directions API error: {directionsError}
                </div>
              ) : (
                <div
                  ref={mapWrapperRef}
                  className={`relative ${isFullscreen ? 'h-screen w-screen bg-slate-950' : ''}`}
                >
                  <GoogleMap
                    zoom={13}
                    center={mapCenter}
                    onLoad={(map) => {
                      mapRef.current = map
                    }}
                    onUnmount={() => {
                      mapRef.current = null
                    }}
                    mapContainerStyle={{
                      width: '100%',
                      height: isFullscreen ? '100%' : '480px',
                    }}
                  >
                    <Polyline
                      path={displayPath}
                      options={{
                        strokeColor: LINE_COLOR,
                        strokeOpacity: 0.9,
                        strokeWeight: 4,
                      }}
                    />
                    {routeData.map((point, index) => (
                      <Marker
                        key={`route-point-${index}`}
                        position={{ lat: point.lat, lng: point.lng }}
                        icon={pointMarkerIcon}
                        clickable={false}
                        zIndex={1}
                      />
                    ))}
                    <Marker
                      position={markerPosition}
                      icon={markerIcon}
                      options={{
                        icon: markerIcon,
                        optimized: false,
                      }}
                    />
                  </GoogleMap>
                  <div className='pointer-events-auto absolute right-3 top-3'>
                    <Button
                      size='sm'
                      variant='outline'
                      className='h-9 w-9 rounded-md bg-white/95 p-0 shadow-sm dark:bg-slate-900/95'
                      onClick={toggleFullscreen}
                      aria-label={
                        isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
                      }
                    >
                      {isFullscreen ? (
                        <Minimize2 className='h-4 w-4' />
                      ) : (
                        <Maximize2 className='h-4 w-4' />
                      )}
                    </Button>
                  </div>
                  {activeAgent ? (
                    <div className='pointer-events-auto absolute bottom-3 left-3 w-[320px] rounded-lg border border-slate-200/80 bg-white/95 p-4 text-xs text-slate-600 shadow-lg backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95 dark:text-slate-200'>
                      <div className='flex items-center justify-between gap-3'>
                        <div>
                          <p className='text-[11px] font-semibold tracking-[0.2em] text-slate-500 uppercase dark:text-slate-400'>
                            Field Agent
                          </p>
                          <p className='text-base font-semibold text-slate-900 dark:text-slate-100'>
                            {activeAgent.name}
                          </p>
                        </div>
                        <Badge
                          variant='outline'
                          className={statusBadgeClass[activeAgent.status]}
                        >
                          {activeAgent.status}
                        </Badge>
                      </div>

                      <div className='mt-3 space-y-1'>
                        <p className='text-sm font-medium text-slate-800 dark:text-slate-200'>
                          {currentLocationLabel}
                        </p>
                        <p className='text-[11px] text-slate-500 dark:text-slate-400'>
                          Last ping {lastPingLabel}
                        </p>
                      </div>

                      <div className='mt-3 rounded-md border border-slate-200/80 bg-slate-50/80 px-2 py-2 dark:border-slate-700/70 dark:bg-slate-800/60'>
                        <div className='flex items-center justify-between text-[10px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400'>
                          <span>Battery</span>
                          <span
                            className={cn(
                              'text-[11px]',
                              batteryTone === 'good' &&
                                'text-emerald-700 dark:text-emerald-300',
                              batteryTone === 'warn' &&
                                'text-amber-700 dark:text-amber-300',
                              batteryTone === 'low' &&
                                'text-rose-700 dark:text-rose-300'
                            )}
                          >
                            {batteryPercent}%
                          </span>
                        </div>
                        <div className='mt-2 flex items-center gap-2'>
                          <div className='relative h-2.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-700/80'>
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                batteryTone === 'good' &&
                                  'bg-gradient-to-r from-emerald-500 to-emerald-400',
                                batteryTone === 'warn' &&
                                  'bg-gradient-to-r from-amber-500 to-amber-400',
                                batteryTone === 'low' &&
                                  'bg-gradient-to-r from-rose-500 to-rose-400'
                              )}
                              style={{ width: `${batteryPercent}%` }}
                            />
                          </div>
                          <div className='h-3 w-1.5 rounded-sm border border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-700' />
                        </div>
                      </div>

                      <div className='mt-3 grid grid-cols-2 gap-3 text-[11px] text-slate-500 dark:text-slate-400'>
                        <div className='rounded-md border border-slate-200/80 bg-slate-50/80 px-2 py-1.5 dark:border-slate-700/70 dark:bg-slate-800/60'>
                          <p className='text-[10px] tracking-wide uppercase'>Speed</p>
                          <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                            {speedKmh.toFixed(1)} km/h
                          </p>
                        </div>
                        <div className='rounded-md border border-slate-200/80 bg-slate-50/80 px-2 py-1.5 dark:border-slate-700/70 dark:bg-slate-800/60'>
                          <p className='text-[10px] tracking-wide uppercase'>Distance</p>
                          <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                            {totalDistanceKm.toFixed(2)} km
                          </p>
                        </div>
                      </div>

                      <div className='mt-3 grid grid-cols-2 gap-3 text-[11px] text-slate-500 dark:text-slate-400'>
                        <button
                          type='button'
                          onClick={() => setOutletDialogOpen(true)}
                          className='rounded-md border border-emerald-200/80 bg-emerald-50/80 px-2 py-1.5 text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:border-emerald-400/50 dark:hover:bg-emerald-500/20'
                          aria-label='View outlets list'
                        >
                          <div className='flex items-center gap-2 text-[10px] tracking-wide uppercase'>
                            <Store className='h-3.5 w-3.5' />
                            <span>Outlets</span>
                          </div>
                          <p className='mt-1 truncate text-sm font-semibold text-emerald-700 dark:text-emerald-200'>
                            {outletCount}
                          </p>
                        </button>
                        <button
                          type='button'
                          onClick={() => setInvoiceDialogOpen(true)}
                          className='rounded-md border border-sky-200/80 bg-sky-50/80 px-2 py-1.5 text-sky-600 transition hover:border-sky-300 hover:bg-sky-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:border-sky-400/50 dark:hover:bg-sky-500/20'
                          aria-label='View invoices list'
                        >
                          <div className='flex items-center gap-2 text-[10px] tracking-wide uppercase'>
                            <Receipt className='h-3.5 w-3.5' />
                            <span>Invoices</span>
                          </div>
                          <p className='mt-1 truncate text-sm font-semibold text-sky-700 dark:text-sky-200'>
                            {invoiceCount}
                          </p>
                        </button>
                      </div>

                      <div className='mt-3 flex gap-3 text-[10px] font-mono text-slate-500 dark:text-slate-400'>
                        <span>Lat {markerPosition.lat.toFixed(4)}</span>
                        <span>Lng {markerPosition.lng.toFixed(4)}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            {!isFullscreen ? (
              <div className='mt-3 rounded-lg border border-slate-200/80 bg-white/95 px-4 py-3 text-xs text-slate-600 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/90 dark:text-slate-200'>
                <div className='flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400'>
                  <span>Tracker</span>
                  <span>{playheadPercent.toFixed(0)}%</span>
                </div>
                <div className='mt-2 flex items-center gap-3'>
                  <span className='min-w-[72px] text-[11px] font-semibold text-slate-700 dark:text-slate-200'>
                    {playheadTimeLabel}
                  </span>
                  <Slider
                    min={0}
                    max={routeProgress}
                    step={0.01}
                    value={[clampedPlayhead]}
                    onValueChange={(value) => {
                      const next = value[0] ?? 0
                      playheadRef.current = next
                      setPlayhead(next)
                      if (isPlaying) setIsPlaying(false)
                    }}
                    className='flex-1'
                    aria-label='Replay seeker'
                  />
                  <span className='min-w-[52px] text-right text-[11px] font-semibold text-slate-700 dark:text-slate-200'>
                    {Math.max(routeProgress - clampedPlayhead, 0).toFixed(0)} pts
                  </span>
                </div>
              </div>
            ) : null}

          </div>
        </CardContent>
      </Card>
      <Dialog open={outletDialogOpen} onOpenChange={setOutletDialogOpen}>
        <DialogContent className='gap-0 p-0 sm:max-w-6xl'>
          <DialogHeader className='border-b px-6 py-4 text-left'>
            <DialogTitle className='flex items-center gap-3 text-base font-semibold'>
              <span className='flex h-9 w-9 items-center justify-center rounded-md bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300'>
                <Store className='h-4 w-4' />
              </span>
              Outlets created
            </DialogTitle>
            <DialogDescription>
              {outletCount} outlets from the selected filters.
            </DialogDescription>
          </DialogHeader>
          <div className='px-6 py-5'>
            <div className='rounded-lg border border-slate-200/70 bg-white/70 dark:border-slate-800/60 dark:bg-slate-950/40'>
              <div className='grid grid-cols-[1.1fr_0.8fr_1.4fr_0.6fr] gap-3 border-b border-slate-200/70 bg-slate-100/80 px-3 py-2 text-[10px] font-semibold tracking-[0.2em] text-slate-500 uppercase dark:border-slate-800/60 dark:bg-slate-900/60 dark:text-slate-400'>
                <span>Outlet</span>
                <span>Location</span>
                <span>Address</span>
                <span>Battery</span>
              </div>
              <div className='max-h-[50vh] overflow-y-auto'>
                {outletRows.length ? (
                  outletRows.map((row) => {
                    const batteryTone =
                      row.batteryPercent === null
                        ? 'unknown'
                        : row.batteryPercent >= 65
                          ? 'good'
                          : row.batteryPercent >= 35
                            ? 'warn'
                            : 'low'
                    const addressKey = buildAddressKey(row.lat, row.lng)
                    const addressLabel =
                      addressLookup[addressKey] ??
                      (isLoaded ? 'Resolving...' : '—')
                    return (
                      <div
                        key={row.key}
                        className='grid grid-cols-[1.1fr_0.8fr_1.4fr_0.6fr] items-center gap-3 border-b border-slate-200/60 px-3 py-2 text-sm last:border-b-0 dark:border-slate-800/50'
                      >
                        <div className='min-w-0'>
                          <p className='truncate font-semibold text-slate-900 dark:text-slate-100'>
                            {row.title}
                          </p>
                        </div>
                        <div className='text-xs text-slate-500 dark:text-slate-400'>
                          {formatLatLng(row.lat, row.lng)}
                        </div>
                        <div
                          className='truncate text-xs text-slate-500 dark:text-slate-400'
                          title={addressLabel}
                        >
                          {addressLabel}
                        </div>
                        <Badge
                          variant='outline'
                          className={cn(
                            'justify-center border px-2 py-0.5 text-[11px] font-semibold',
                            batteryTone === 'unknown' &&
                              'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
                            batteryTone === 'good' &&
                              'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200',
                            batteryTone === 'warn' &&
                              'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
                            batteryTone === 'low' &&
                              'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200'
                          )}
                        >
                          {formatBatteryLabel(row.batteryPercent)}
                        </Badge>
                      </div>
                    )
                  })
                ) : (
                  <div className='px-3 py-6 text-sm text-slate-500 dark:text-slate-400'>
                    No outlets created for the selected filters.
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className='gap-0 p-0 sm:max-w-6xl'>
          <DialogHeader className='border-b px-6 py-4 text-left'>
            <DialogTitle className='flex items-center gap-3 text-base font-semibold'>
              <span className='flex h-9 w-9 items-center justify-center rounded-md bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300'>
                <Receipt className='h-4 w-4' />
              </span>
              Invoices created
            </DialogTitle>
            <DialogDescription>
              {invoiceCount} invoices from the selected filters.
            </DialogDescription>
          </DialogHeader>
          <div className='px-6 py-5'>
            <div className='rounded-lg border border-slate-200/70 bg-white/70 dark:border-slate-800/60 dark:bg-slate-950/40'>
              <div className='grid grid-cols-[1.1fr_0.8fr_1.4fr_0.6fr] gap-3 border-b border-slate-200/70 bg-slate-100/80 px-3 py-2 text-[10px] font-semibold tracking-[0.2em] text-slate-500 uppercase dark:border-slate-800/60 dark:bg-slate-900/60 dark:text-slate-400'>
                <span>Invoice</span>
                <span>Location</span>
                <span>Address</span>
                <span>Battery</span>
              </div>
              <div className='max-h-[50vh] overflow-y-auto'>
                {invoiceRows.length ? (
                  invoiceRows.map((row) => {
                    const batteryTone =
                      row.batteryPercent === null
                        ? 'unknown'
                        : row.batteryPercent >= 65
                          ? 'good'
                          : row.batteryPercent >= 35
                            ? 'warn'
                            : 'low'
                    const addressKey = buildAddressKey(row.lat, row.lng)
                    const addressLabel =
                      addressLookup[addressKey] ??
                      (isLoaded ? 'Resolving...' : '—')
                    return (
                      <div
                        key={row.key}
                        className='grid grid-cols-[1.1fr_0.8fr_1.4fr_0.6fr] items-center gap-3 border-b border-slate-200/60 px-3 py-2 text-sm last:border-b-0 dark:border-slate-800/50'
                      >
                        <div className='min-w-0'>
                          <InvoiceNumber
                            invoiceId={row.title}
                            className='block truncate font-mono text-[13px] font-semibold text-slate-900 dark:text-slate-100'
                          />
                        </div>
                        <div className='text-xs text-slate-500 dark:text-slate-400'>
                          {formatLatLng(row.lat, row.lng)}
                        </div>
                        <div
                          className='truncate text-xs text-slate-500 dark:text-slate-400'
                          title={addressLabel}
                        >
                          {addressLabel}
                        </div>
                        <Badge
                          variant='outline'
                          className={cn(
                            'justify-center border px-2 py-0.5 text-[11px] font-semibold',
                            batteryTone === 'unknown' &&
                              'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
                            batteryTone === 'good' &&
                              'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200',
                            batteryTone === 'warn' &&
                              'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
                            batteryTone === 'low' &&
                              'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200'
                          )}
                        >
                          {formatBatteryLabel(row.batteryPercent)}
                        </Badge>
                      </div>
                    )
                  })
                ) : (
                  <div className='px-3 py-6 text-sm text-slate-500 dark:text-slate-400'>
                    No invoices created for the selected filters.
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default GPSMonitoring
