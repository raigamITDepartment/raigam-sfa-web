import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { HomeReportItem } from '@/services/reports/homeReportApi'

type DayKey = { count: string; value: string }

type Props = {
  rows: HomeReportItem[]
  dayKeys: DayKey[]
  isFetching?: boolean
}

export function HomeReportTable({ rows, dayKeys, isFetching }: Props) {
  const number = (v: number | null | undefined) =>
    typeof v === 'number' ? v.toLocaleString() : '-'
  const currency = (v: number | null | undefined) =>
    typeof v === 'number'
      ? v.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : '-'

  return (
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
  )
}

