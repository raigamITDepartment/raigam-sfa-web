import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getAllUserSubChannels, getAllUserTerritory } from '@/services/userDemarcationApi'
import { getHomeReportData, type HomeReportItem } from '@/services/reports/homeReportApi'

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export const Route = createFileRoute('/_authenticated/dashboard/home-report')({
  component: HomeReportPage,
})

function HomeReportPage() {
  const now = new Date()
  const [subChannelId, setSubChannelId] = useState<string | undefined>(undefined)
  const [month, setMonth] = useState<number>(now.getMonth() + 1)
  const [year, setYear] = useState<number>(now.getFullYear())
  const [territoryId, setTerritoryId] = useState<string | undefined>(undefined)
  const [startDate, setStartDate] = useState<string | undefined>(undefined)
  const [endDate, setEndDate] = useState<string | undefined>(undefined)

  const { data: subChannels } = useQuery({
    queryKey: ['userSubChannels'],
    queryFn: async () => (await getAllUserSubChannels()).payload,
    staleTime: 5 * 60 * 1000,
  })

  const { data: territories } = useQuery({
    queryKey: ['userTerritories'],
    queryFn: async () => (await getAllUserTerritory()).payload,
    staleTime: 5 * 60 * 1000,
  })

  const enabled = Boolean(subChannelId && month && year)

  const { data, isFetching } = useQuery({
    queryKey: [
      'homeReport',
      { subChannelId, month, year, territoryId, startDate, endDate },
    ],
    queryFn: async () =>
      getHomeReportData({
        subChannelId,
        month,
        year,
        territoryId,
        startDate,
        endDate,
      }),
    enabled,
  })

  const rows: HomeReportItem[] = data?.payload ?? []

  const dayCount = useMemo(() => daysInMonth(year, month), [year, month])
  const dayKeys = useMemo(
    () =>
      Array.from({ length: 31 }, (_, i) => {
        const n = String(i + 1).padStart(2, '0')
        return { count: `day${n}Count` as const, value: `day${n}Value` as const }
      }).slice(0, dayCount),
    [dayCount]
  )

  const number = (v: number | null | undefined) =>
    typeof v === 'number' ? v.toLocaleString() : '-'

  const currency = (v: number | null | undefined) =>
    typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'

  return (
    <Main>
      <PageHeader title='Home Report' description='Channel/territory day-wise summary' />

      <Card className='p-4 mb-4'>
        <div className='grid grid-cols-1 md:grid-cols-6 gap-3 items-end'>
          <div>
            <Label>Sub Channel</Label>
            <Select value={subChannelId} onValueChange={setSubChannelId}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select sub-channel' />
              </SelectTrigger>
              <SelectContent>
                {subChannels?.map((s: any) => {
                  const id = s?.id ?? s?.subChannelId ?? s?.SubChannelId
                  const name = s?.name ?? s?.subChannelName ?? s?.SubChannelName
                  if (id == null || name == null) return null
                  return (
                    <SelectItem key={String(id)} value={String(id)}>
                      {String(name)}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Month</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select month' />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {new Date(2000, m - 1, 1).toLocaleString(undefined, {
                      month: 'long',
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Year</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select year' />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i).map(
                  (y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Territory (optional)</Label>
            <Select
              value={territoryId ?? 'all'}
              onValueChange={(v) => setTerritoryId(v === 'all' ? undefined : v)}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='All territories' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={'all'}>All</SelectItem>
                {territories?.map((t: any) => {
                  const id = t?.id ?? t?.territoryId ?? t?.TerritoryId
                  const name = t?.name ?? t?.territoryName ?? t?.TerritoryName
                  if (id == null || name == null) return null
                  return (
                    <SelectItem key={String(id)} value={String(id)}>
                      {String(name)}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Start Date (optional)</Label>
            <Input
              type='date'
              value={startDate ?? ''}
              onChange={(e) => setStartDate(e.target.value || undefined)}
            />
          </div>
          <div>
            <Label>End Date (optional)</Label>
            <Input
              type='date'
              value={endDate ?? ''}
              onChange={(e) => setEndDate(e.target.value || undefined)}
            />
          </div>
        </div>
      </Card>

      <Card className='p-2 overflow-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='whitespace-nowrap'>Region</TableHead>
              <TableHead className='whitespace-nowrap'>Area</TableHead>
              <TableHead className='whitespace-nowrap'>Territory</TableHead>
              <TableHead className='whitespace-nowrap'>Working Days</TableHead>
              <TableHead className='whitespace-nowrap'>PC Target</TableHead>
              <TableHead className='whitespace-nowrap'>Value Target</TableHead>
              {dayKeys.map((d, idx) => (
                <TableHead key={d.count} className='text-center whitespace-nowrap'>
                  {String(idx + 1).padStart(2, '0')}
                </TableHead>
              ))}
              <TableHead className='whitespace-nowrap'>Total Count</TableHead>
              <TableHead className='whitespace-nowrap'>Total Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFetching && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6 + dayKeys.length + 2}>Loading...</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6 + dayKeys.length + 2}>No data</TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className='whitespace-nowrap'>{r.regionName}</TableCell>
                  <TableCell className='whitespace-nowrap'>{r.areaName}</TableCell>
                  <TableCell className='whitespace-nowrap'>{r.territoryName}</TableCell>
                  <TableCell className='text-right'>{number(r.workingDays)}</TableCell>
                  <TableCell className='text-right'>{number(r.pcTarget)}</TableCell>
                  <TableCell className='text-right'>{currency(r.valueTarget)}</TableCell>
                  {dayKeys.map((d) => (
                    <TableCell key={d.count} className='text-right'>
                      {number((r as any)[d.count])}/{currency((r as any)[d.value])}
                    </TableCell>
                  ))}
                  <TableCell className='text-right'>{number(r.totalCount)}</TableCell>
                  <TableCell className='text-right'>{currency(r.totalValue)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </Main>
  )
}
