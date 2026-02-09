import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, Store, Truck, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CountBadge } from '@/components/ui/count-badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getAllAgency,
  getAllChannel,
  getAllDistributors,
  getAllOutlets,
  getAllRoutes,
  getAllSubChannel,
  getAllTerritories,
} from '@/services/userDemarcationApi'
import { getAllUsers } from '@/services/users/userApi'
import { cn } from '@/lib/utils'

type Tone = 'positive' | 'warning' | 'negative' | 'neutral' | 'info'

type ActiveRecord = {
  isActive?: boolean
  active?: boolean
  status?: string
  enabled?: boolean
}

type ActiveStats = {
  total: number
  active: number
  inactive: number
  ratio: number
}

type StatusInfo = {
  label: string
  tone: Tone
  detail: string
  countLabel: string
}

type StatusItem = {
  name: string
  stats: ActiveStats
  loading: boolean
  error: boolean
  hasStatus?: boolean
}

const toneClasses: Record<Tone, string> = {
  positive:
    'border border-[var(--chart-2)]/35 bg-[var(--chart-2)]/15 text-[var(--chart-2)] dark:border-[var(--chart-2)]/55 dark:bg-[var(--chart-2)]/30',
  warning:
    'border border-[var(--chart-4)]/35 bg-[var(--chart-4)]/15 text-[var(--chart-4)] dark:border-[var(--chart-4)]/55 dark:bg-[var(--chart-4)]/30',
  negative:
    'border border-destructive/35 bg-destructive/15 text-destructive dark:border-destructive/60 dark:bg-destructive/30',
  neutral:
    'border border-muted-foreground/25 bg-muted text-muted-foreground dark:border-muted-foreground/40 dark:bg-muted/60',
  info: 'border border-[var(--chart-3)]/35 bg-[var(--chart-3)]/15 text-[var(--chart-3)] dark:border-[var(--chart-3)]/55 dark:bg-[var(--chart-3)]/30',
}

const formatCount = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value) ? String(value) : '--'

const resolveActiveFlag = (record: ActiveRecord) => {
  const rawStatus =
    (record.status as string | boolean | undefined) ??
    (record.isActive as boolean | undefined) ??
    (record.active as boolean | undefined) ??
    (record.enabled as boolean | undefined)

  if (typeof rawStatus === 'string') {
    return rawStatus.toLowerCase() === 'active'
  }

  return Boolean(rawStatus)
}

const buildActiveStats = <T extends ActiveRecord>(rows: T[]): ActiveStats => {
  const total = rows.length
  const active = rows.filter((row) => resolveActiveFlag(row)).length
  const inactive = total - active
  const ratio = total > 0 ? active / total : 0
  return { total, active, inactive, ratio }
}

const hasActiveSignal = <T extends ActiveRecord>(rows: T[]) =>
  rows.some((row) => {
    const rawStatus =
      (row.status as string | boolean | undefined) ??
      (row.isActive as boolean | undefined) ??
      (row.active as boolean | undefined) ??
      (row.enabled as boolean | undefined)
    return rawStatus !== undefined && rawStatus !== null
  })

const resolveToneFromRatio = (ratio: number): Tone => {
  if (ratio >= 0.9) return 'positive'
  if (ratio >= 0.75) return 'info'
  if (ratio >= 0.5) return 'warning'
  return 'negative'
}

const ratioToPercent = (ratio: number) => `${Math.round(ratio * 100)}%`

const resolveStatusInfo = (
  stats: ActiveStats,
  loading: boolean,
  error: boolean,
  hasStatus = true
): StatusInfo => {
  if (error) {
    return {
      label: 'Error',
      tone: 'negative',
      detail: 'Unable to load data',
      countLabel: 'N/A',
    }
  }

  if (loading) {
    return {
      label: 'Loading',
      tone: 'neutral',
      detail: 'Fetching data',
      countLabel: '...',
    }
  }

  if (stats.total === 0) {
    return {
      label: 'No data',
      tone: 'neutral',
      detail: 'Total 0 | Inactive 0',
      countLabel: '0 inactive',
    }
  }

  if (!hasStatus) {
    return {
      label: `Total ${formatCount(stats.total)}`,
      tone: 'neutral',
      detail: 'Status not provided',
      countLabel: `Total ${formatCount(stats.total)}`,
    }
  }

  return {
    label: `${ratioToPercent(stats.ratio)} active`,
    tone: resolveToneFromRatio(stats.ratio),
    detail: `Total ${formatCount(stats.total)} | Inactive ${formatCount(
      stats.inactive
    )}`,
    countLabel: `${formatCount(stats.inactive)} inactive`,
  }
}

type ToneBadgeProps = {
  tone: Tone
  children: ReactNode
}

const toneIconClasses: Record<Tone, string> = {
  positive:
    'bg-[var(--chart-2)]/25 text-[var(--chart-2)] dark:bg-[var(--chart-2)]/40',
  warning:
    'bg-[var(--chart-4)]/25 text-[var(--chart-4)] dark:bg-[var(--chart-4)]/40',
  negative: 'bg-destructive/20 text-destructive dark:bg-destructive/40',
  neutral: 'bg-muted text-muted-foreground dark:bg-muted/60',
  info:
    'bg-[var(--chart-3)]/25 text-[var(--chart-3)] dark:bg-[var(--chart-3)]/40',
}

function ToneBadge({ tone, children }: ToneBadgeProps) {
  return (
    <Badge
      variant='outline'
      className={cn(
        'border-transparent text-[10px] font-semibold uppercase tracking-wide',
        toneClasses[tone]
      )}
    >
      {children}
    </Badge>
  )
}

type MetricCardProps = {
  title: string
  value: string
  delta: string
  tone: Tone
  note: string
  isLoading?: boolean
  icon: ReactNode
  className?: string
}

function MetricCard({
  title,
  value,
  delta,
  tone,
  note,
  isLoading,
  icon,
  className,
}: MetricCardProps) {
  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          {isLoading ? (
            <Skeleton className='size-9 rounded-md' />
          ) : (
            <div
              className={cn(
                'flex size-9 items-center justify-center rounded-md',
                toneIconClasses[tone]
              )}
            >
              {icon}
            </div>
          )}
          <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            {title}
          </p>
        </div>
        {isLoading ? (
          <Skeleton className='h-5 w-16' />
        ) : (
          <ToneBadge tone={tone}>{delta}</ToneBadge>
        )}
      </div>
      <div className='mt-3 text-2xl font-semibold'>
        {isLoading ? <Skeleton className='h-7 w-24' /> : value}
      </div>
      <div className='text-xs text-muted-foreground'>
        {isLoading ? <Skeleton className='h-3 w-24' /> : note}
      </div>
    </div>
  )
}

export function SystemAdminOverview() {
  const usersQuery = useQuery({
    queryKey: ['user-demarcation', 'users'],
    queryFn: getAllUsers,
  })
  const channelsQuery = useQuery({
    queryKey: ['channels'],
    queryFn: getAllChannel,
  })
  const subChannelsQuery = useQuery({
    queryKey: ['sub-channels'],
    queryFn: getAllSubChannel,
  })
  const territoriesQuery = useQuery({
    queryKey: ['territories'],
    queryFn: getAllTerritories,
  })
  const routesQuery = useQuery({
    queryKey: ['routes'],
    queryFn: getAllRoutes,
  })
  const outletsQuery = useQuery({
    queryKey: ['user-demarcation', 'outlets'],
    queryFn: getAllOutlets,
  })
  const agenciesQuery = useQuery({
    queryKey: ['agencies'],
    queryFn: getAllAgency,
  })
  const distributorsQuery = useQuery({
    queryKey: ['distributors'],
    queryFn: getAllDistributors,
  })

  const users = usersQuery.data?.payload ?? []
  const userActive = users.filter((user) => user.isActive).length
  const userInactive = users.length - userActive
  const userRatio = users.length ? userActive / users.length : 0

  const channelStats = buildActiveStats(channelsQuery.data?.payload ?? [])
  const subChannelStats = buildActiveStats(
    subChannelsQuery.data?.payload ?? []
  )
  const territoryStats = buildActiveStats(
    territoriesQuery.data?.payload ?? []
  )
  const routeStats = buildActiveStats(routesQuery.data?.payload ?? [])
  const outlets = outletsQuery.data?.payload ?? []
  const outletRecords = outlets as ActiveRecord[]
  const outletHasStatus = hasActiveSignal(outletRecords)
  const outletSupportsStatus =
    outletHasStatus || outletsQuery.isLoading || outletsQuery.isError
  const outletStats = outletHasStatus
    ? buildActiveStats(outletRecords)
    : {
        total: outlets.length,
        active: 0,
        inactive: 0,
        ratio: 0,
      }
  const agencyStats = buildActiveStats(agenciesQuery.data?.payload ?? [])
  const distributorStats = buildActiveStats(
    distributorsQuery.data?.payload ?? []
  )

  const summaryMetrics = [
    {
      title: 'Users',
      value: usersQuery.isError ? '--' : formatCount(users.length),
      delta: usersQuery.isError
        ? 'Error'
        : `${formatCount(userActive)} active`,
      tone: usersQuery.isError
        ? 'negative'
        : resolveToneFromRatio(userRatio),
      note: usersQuery.isError
        ? 'Unable to load users'
        : `Inactive ${formatCount(userInactive)}`,
      isLoading: usersQuery.isLoading,
      icon: <Users className='size-4' />,
      className:
        'border-[var(--chart-2)]/30 bg-[var(--chart-2)]/10 dark:border-[var(--chart-2)]/55 dark:bg-[var(--chart-2)]/25',
    },
    {
      title: 'Outlets',
      value: outletsQuery.isError ? '--' : formatCount(outletStats.total),
      delta: outletsQuery.isError
        ? 'Error'
        : outletHasStatus
          ? `${formatCount(outletStats.active)} active`
          : 'Total',
      tone: outletsQuery.isError
        ? 'negative'
        : outletHasStatus
          ? resolveToneFromRatio(outletStats.ratio)
          : 'neutral',
      note: outletsQuery.isError
        ? 'Unable to load outlets'
        : outletHasStatus
          ? `Inactive ${formatCount(outletStats.inactive)}`
          : 'Status not provided',
      isLoading: outletsQuery.isLoading,
      icon: <Store className='size-4' />,
      className:
        'border-[var(--chart-3)]/30 bg-[var(--chart-3)]/10 dark:border-[var(--chart-3)]/55 dark:bg-[var(--chart-3)]/25',
    },
    {
      title: 'Agencies',
      value: agenciesQuery.isError ? '--' : formatCount(agencyStats.total),
      delta: agenciesQuery.isError
        ? 'Error'
        : `${formatCount(agencyStats.active)} active`,
      tone: agenciesQuery.isError
        ? 'negative'
        : resolveToneFromRatio(agencyStats.ratio),
      note: agenciesQuery.isError
        ? 'Unable to load agencies'
        : `Inactive ${formatCount(agencyStats.inactive)}`,
      isLoading: agenciesQuery.isLoading,
      icon: <Building2 className='size-4' />,
      className:
        'border-[var(--chart-1)]/30 bg-[var(--chart-1)]/10 dark:border-[var(--chart-1)]/55 dark:bg-[var(--chart-1)]/25',
    },
    {
      title: 'Distributors',
      value: distributorsQuery.isError
        ? '--'
        : formatCount(distributorStats.total),
      delta: distributorsQuery.isError
        ? 'Error'
        : `${formatCount(distributorStats.active)} active`,
      tone: distributorsQuery.isError
        ? 'negative'
        : resolveToneFromRatio(distributorStats.ratio),
      note: distributorsQuery.isError
        ? 'Unable to load distributors'
        : `Inactive ${formatCount(distributorStats.inactive)}`,
      isLoading: distributorsQuery.isLoading,
      icon: <Truck className='size-4' />,
      className:
        'border-[var(--chart-5)]/30 bg-[var(--chart-5)]/10 dark:border-[var(--chart-5)]/55 dark:bg-[var(--chart-5)]/25',
    },
  ]

  const coverageItems: StatusItem[] = [
    {
      name: 'Channels',
      stats: channelStats,
      loading: channelsQuery.isLoading,
      error: channelsQuery.isError,
    },
    {
      name: 'Sub Channels',
      stats: subChannelStats,
      loading: subChannelsQuery.isLoading,
      error: subChannelsQuery.isError,
    },
    {
      name: 'Routes',
      stats: routeStats,
      loading: routesQuery.isLoading,
      error: routesQuery.isError,
    },
  ]

  const healthItems: StatusItem[] = [
    {
      name: 'Territories',
      stats: territoryStats,
      loading: territoriesQuery.isLoading,
      error: territoriesQuery.isError,
    },
    {
      name: 'Outlets',
      stats: outletStats,
      loading: outletsQuery.isLoading,
      error: outletsQuery.isError,
      hasStatus: outletHasStatus,
    },
    {
      name: 'Agencies',
      stats: agencyStats,
      loading: agenciesQuery.isLoading,
      error: agenciesQuery.isError,
    },
    {
      name: 'Distributors',
      stats: distributorStats,
      loading: distributorsQuery.isLoading,
      error: distributorsQuery.isError,
    },
  ]

  const attentionQueue = [
    {
      title: 'Inactive users',
      owner: 'User Module',
      count: userInactive,
      loading: usersQuery.isLoading,
      error: usersQuery.isError,
    },
    {
      title: 'Inactive routes',
      owner: 'Route Mapping',
      count: routeStats.inactive,
      loading: routesQuery.isLoading,
      error: routesQuery.isError,
    },
    ...(outletSupportsStatus
      ? [
          {
            title: 'Inactive outlets',
            owner: 'Outlet Module',
            count: outletStats.inactive,
            loading: outletsQuery.isLoading,
            error: outletsQuery.isError,
          },
        ]
      : []),
    {
      title: 'Inactive agencies',
      owner: 'Agency Mapping',
      count: agencyStats.inactive,
      loading: agenciesQuery.isLoading,
      error: agenciesQuery.isError,
    },
    {
      title: 'Inactive distributors',
      owner: 'Distributor Mapping',
      count: distributorStats.inactive,
      loading: distributorsQuery.isLoading,
      error: distributorsQuery.isError,
    },
  ]

  const latestUsers = users
    .slice()
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
    .slice(0, 6)

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader className='space-y-1'>
          <CardTitle className='text-lg'>System Command Center</CardTitle>
          <CardDescription>
            Live counts from user and master data modules.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-5'>
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4'>
            {summaryMetrics.map((metric) => (
              <MetricCard key={metric.title} {...metric} />
            ))}
          </div>
          <Separator />
          <div className='grid gap-3 md:grid-cols-3'>
            {coverageItems.map((item) => {
              const status = resolveStatusInfo(
                item.stats,
                item.loading,
                item.error,
                item.hasStatus ?? true
              )

              return (
                <div
                  key={item.name}
                  className='flex items-center justify-between rounded-lg border bg-background p-3'
                >
                  <div>
                    <p className='text-sm font-medium'>{item.name}</p>
                    <p className='text-xs text-muted-foreground'>
                      {status.detail}
                    </p>
                  </div>
                  <ToneBadge tone={status.tone}>{status.label}</ToneBadge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Master Data Status</CardTitle>
            <CardDescription>
              Active vs inactive records across modules.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {healthItems.map((item) => {
              const status = resolveStatusInfo(
                item.stats,
                item.loading,
                item.error,
                item.hasStatus ?? true
              )
              const countClass =
                item.loading || item.error
                  ? 'bg-muted text-muted-foreground'
                  : item.hasStatus === false
                    ? 'bg-[var(--chart-3)]/15 text-[var(--chart-3)]'
                    : item.stats.inactive > 0
                      ? 'bg-[var(--chart-4)]/15 text-[var(--chart-4)]'
                      : 'bg-[var(--chart-2)]/15 text-[var(--chart-2)]'

              return (
                <div
                  key={item.name}
                  className='flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3 dark:bg-muted/30'
                >
                  <div className='space-y-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <p className='text-sm font-semibold'>{item.name}</p>
                      <ToneBadge tone={status.tone}>{status.label}</ToneBadge>
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      {status.detail}
                    </p>
                  </div>
                  <CountBadge value={status.countLabel} className={countClass} />
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Attention Queue</CardTitle>
            <CardDescription>Records waiting for review.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <ScrollArea className='h-[280px] pe-2'>
              <div className='space-y-3'>
                {attentionQueue.map((item) => {
                  const queueTone: Tone = item.error
                    ? 'negative'
                    : item.loading
                      ? 'neutral'
                      : item.count > 0
                        ? 'warning'
                        : 'positive'
                  const queueLabel = item.error
                    ? 'Error'
                    : item.loading
                      ? 'Loading'
                      : item.count > 0
                        ? 'Review'
                        : 'Clear'
                  const countLabel = item.error
                    ? 'N/A'
                    : item.loading
                      ? '...'
                      : formatCount(item.count)

                  return (
                    <div
                      key={item.title}
                      className='flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3 dark:bg-muted/30'
                    >
                      <div>
                        <p className='text-sm font-semibold'>{item.title}</p>
                        <p className='text-xs text-muted-foreground'>
                          Owner: {item.owner}
                        </p>
                      </div>
                      <div className='flex items-center gap-2'>
                        <CountBadge value={countLabel} />
                        <ToneBadge tone={queueTone}>{queueLabel}</ToneBadge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Latest Users</CardTitle>
          <CardDescription>Recent users in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className='py-6'>
                    <div className='space-y-2'>
                      <Skeleton className='h-4 w-full' />
                      <Skeleton className='h-4 w-5/6' />
                    </div>
                  </TableCell>
                </TableRow>
              ) : usersQuery.isError ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className='text-destructive py-6 text-center text-sm'
                  >
                    Unable to load users.
                  </TableCell>
                </TableRow>
              ) : latestUsers.length ? (
                latestUsers.map((user) => {
                  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                  const displayName = name || user.userName || 'N/A'
                  const groupLabel =
                    user.userGroupName?.trim() ||
                    user.roleName?.trim() ||
                    user.subRoleName?.trim() ||
                    'N/A'
                  const startDate = user.startDate
                    ? user.startDate.split('T')[0]
                    : 'N/A'

                  return (
                    <TableRow key={user.id}>
                      <TableCell className='font-medium'>
                        {displayName}
                      </TableCell>
                      <TableCell>{groupLabel}</TableCell>
                      <TableCell>
                        <ToneBadge tone={user.isActive ? 'positive' : 'negative'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </ToneBadge>
                      </TableCell>
                      <TableCell>{startDate}</TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className='text-muted-foreground py-6 text-center text-sm'
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
