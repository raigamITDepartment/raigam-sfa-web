export type RoutePoint = {
  lat: number
  lng: number
  time: string
  label?: string
  batteryPercentage?: string
}

export type RouteResponse = {
  user: string
  route: RoutePoint[]
}

/**
 * Expand sparse anchor points into per-minute points.
 * - Keeps anchors exact
 * - Linearly interpolates lat/lng between anchors
 * - Generates a point every `stepSeconds` (default 60s)
 */
export function expandRouteEveryMinute(
  anchors: RoutePoint[],
  stepSeconds: number = 60
): RoutePoint[] {
  if (!anchors?.length) return []

  const out: RoutePoint[] = []

  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i]
    const b = anchors[i + 1]

    const tA = Date.parse(a.time)
    const tB = Date.parse(b.time)

    if (!Number.isFinite(tA) || !Number.isFinite(tB) || tB <= tA) {
      // If times are invalid or same/backwards, just push anchor and continue
      if (out.length === 0 || out[out.length - 1].time !== a.time) out.push(a)
      continue
    }

    const totalSeconds = Math.floor((tB - tA) / 1000)
    const steps = Math.floor(totalSeconds / stepSeconds)

    // Add starting anchor (avoid duplicates)
    if (out.length === 0 || out[out.length - 1].time !== a.time) out.push(a)

    for (let s = 1; s <= steps; s++) {
      const ratio = (s * stepSeconds) / totalSeconds
      const lat = a.lat + (b.lat - a.lat) * ratio
      const lng = a.lng + (b.lng - a.lng) * ratio
      const time = new Date(tA + s * stepSeconds * 1000).toISOString()

      // If this time is exactly the next anchor time, skip (anchor will be added)
      if (time === b.time) continue

      out.push({
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        time,
        label: a.label,
        batteryPercentage: a.batteryPercentage ?? b.batteryPercentage,
      })
    }

    // Ensure ending anchor is included
    if (out[out.length - 1].time !== b.time) out.push(b)
  }

  return out
}

// ---------------------
// Your anchor route
// ---------------------
export const ANCHOR_ROUTE: RoutePoint[] = [
  {
    lat: 6.5854,
    lng: 79.9607,
    time: '2025-12-16T03:30:00Z',
    label: 'Kalutara',
    batteryPercentage: '99%',
  },
  {
    lat: 6.6038,
    lng: 79.9502,
    time: '2025-12-16T03:40:00Z',
    label: 'Payagala',
    batteryPercentage: '99%',
  },
  {
    lat: 6.6289,
    lng: 79.9349,
    time: '2025-12-16T03:50:00Z',
    label: 'Maggona',
    batteryPercentage: '98%',
  },
  {
    lat: 6.6509,
    lng: 79.9256,
    time: '2025-12-16T04:00:00Z',
    label: 'Wadduwa',
    batteryPercentage: '98%',
  },
  {
    lat: 6.7202,
    lng: 79.9024,
    time: '2025-12-16T04:15:00Z',
    label: 'Panadura',
    batteryPercentage: '98%',
  },
  {
    lat: 6.7426,
    lng: 79.8961,
    time: '2025-12-16T04:25:00Z',
    label: 'Egodauyana',
    batteryPercentage: '96%',
  },
  {
    lat: 6.767,
    lng: 79.8901,
    time: '2025-12-16T04:35:00Z',
    label: 'Moratuwa',
    batteryPercentage: '96%',
  },
  {
    lat: 6.7894,
    lng: 79.8871,
    time: '2025-12-16T04:45:00Z',
    label: 'Katubedda',
    batteryPercentage: '95%',
  },
  {
    lat: 6.8098,
    lng: 79.8789,
    time: '2025-12-16T04:55:00Z',
    label: 'Ratmalana',
    batteryPercentage: '95%',
  },
  {
    lat: 6.8295,
    lng: 79.8659,
    time: '2025-12-16T05:05:00Z',
    label: 'Dehiwala',
    batteryPercentage: '94%',
  },
  {
    lat: 6.8526,
    lng: 79.8623,
    time: '2025-12-16T05:15:00Z',
    label: 'Wellawatte',
    batteryPercentage: '93%',
  },
  {
    lat: 6.8741,
    lng: 79.8612,
    time: '2025-12-16T05:20:00Z',
    label: 'Bambalapitiya',
    batteryPercentage: '92%',
  },
  {
    lat: 6.9,
    lng: 79.8588,
    time: '2025-12-16T05:25:00Z',
    label: 'Kollupitiya',
    batteryPercentage: '90%',
  },
  {
    lat: 6.9271,
    lng: 79.8612,
    time: '2025-12-16T05:30:00Z',
    label: 'Colombo',
    batteryPercentage: '88%',
  },
]

// Build per-minute points:
export const ONE_MINUTE_ROUTE: RoutePoint[] = expandRouteEveryMinute(
  ANCHOR_ROUTE,
  60
)

export const mockRouteResponse: RouteResponse = {
  user: 'U001',
  route: ONE_MINUTE_ROUTE,
}
