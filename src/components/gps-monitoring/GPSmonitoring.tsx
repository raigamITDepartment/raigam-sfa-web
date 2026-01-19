import { useEffect, useMemo, useRef, useState } from 'react'
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from '@react-google-maps/api'
import { Maximize2, Minimize2, Pause, Play, Rabbit, Turtle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { GPSMonitoringFilter } from '@/components/gps-monitoring/Filter'
import { mockRouteResponse } from '@/components/gps-monitoring/MockRouteResponse'

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
}

const REPLAY_INTERVAL_MS = 800
const SPEED_OPTIONS = [0.5, 1, 2, 4]
const MARKER_ICON_URL = '/map_maker.png'
const LINE_COLOR = '#f40203'
const EARTH_RADIUS_KM = 6371
const MAX_WAYPOINTS = 20

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
  const activeAgent = mockAgents[0]
  const [routeIndex, setRouteIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [speedIndex, setSpeedIndex] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [directionsPath, setDirectionsPath] = useState<
    { lat: number; lng: number }[] | null
  >(null)
  const [directionsError, setDirectionsError] = useState<string | null>(null)
  const [geocodeLabel, setGeocodeLabel] = useState<string | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const mapWrapperRef = useRef<HTMLDivElement | null>(null)
  const routeData = mockRouteResponse.route
  const speedMultiplier = SPEED_OPTIONS[speedIndex] ?? 1
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as
    | string
    | undefined

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
  const markerIndex = directionsPath
    ? Math.round((routeIndex / routeProgress) * (snappedPath.length - 1))
    : routeIndex
  const displayPath = snappedPath.slice(0, markerIndex + 1)
  const mapCenter = snappedPath[0] ?? { lat: 6.9271, lng: 79.8612 }
  const markerPosition = snappedPath[markerIndex] ?? mapCenter
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
  const geocodeCacheRef = useRef(new Map<string, string>())
  const lastGeocodeRef = useRef(0)

  useEffect(() => {
    if (!routePath.length) return
    setRouteIndex(0)
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
    const interval = Math.max(100, REPLAY_INTERVAL_MS / speedMultiplier)
    const timer = window.setInterval(() => {
      setRouteIndex((prev) =>
        prev < routePath.length - 1 ? prev + 1 : prev
      )
    }, interval)
    return () => window.clearInterval(timer)
  }, [isPlaying, routePath, speedMultiplier])

  return (
    <div className='space-y-4'>
      <GPSMonitoringFilter />
      <Card>
        <CardContent className='px-4 space-y-4'>
          <div className='rounded-md border bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <p className='text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300'>
                  Live Map
                </p>
                <p className='text-sm text-slate-700 dark:text-slate-200'>
                  Mock preview for GPS signals and device trails.
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
                    <div className='pointer-events-none absolute bottom-3 left-3 w-[320px] rounded-lg border border-slate-200/80 bg-white/95 p-4 text-xs text-slate-600 shadow-lg backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95 dark:text-slate-200'>
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
                          Last ping {activeAgent.lastPing}
                        </p>
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

                      <div className='mt-3 flex gap-3 text-[10px] font-mono text-slate-500 dark:text-slate-400'>
                        <span>Lat {markerPosition.lat.toFixed(4)}</span>
                        <span>Lng {markerPosition.lng.toFixed(4)}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GPSMonitoring
