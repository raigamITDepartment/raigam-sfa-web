import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getAllArea,
  getAllRange,
  getAllSubChannel,
  type ApiResponse,
  type AreaDTO,
  type RangeDTO,
  type SubChannelDTO,
} from '@/services/userDemarcationApi'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '../ui/button'

const monthOptions = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

function Filters() {
  const [subChannelId, setSubChannelId] = useState<string>('')
  const [areaId, setAreaId] = useState<string>('')
  const [rangeId, setRangeId] = useState<string>('')
  const [year, setYear] = useState<string>('')
  const [month, setMonth] = useState<string>('')

  const currentYear = new Date().getFullYear()
  const yearOptions = useMemo(() => {
    const start = 2020
    const end = currentYear + 1
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [currentYear])

  const { data: subChannels } = useQuery({
    queryKey: ['user-demarcation', 'sub-channels'],
    queryFn: async () => {
      const res = (await getAllSubChannel()) as ApiResponse<SubChannelDTO[]>
      return res.payload
    },
  })

  const { data: areas } = useQuery({
    queryKey: ['user-demarcation', 'areas'],
    queryFn: async () => {
      const res = (await getAllArea()) as ApiResponse<AreaDTO[]>
      return res.payload
    },
  })

  const { data: ranges } = useQuery({
    queryKey: ['user-demarcation', 'ranges'],
    queryFn: async () => {
      const res = (await getAllRange()) as ApiResponse<RangeDTO[]>
      return res.payload
    },
  })

  const handleApply = () => {
    const payload = {
      subChannelId: subChannelId ? Number(subChannelId) : undefined,
      areaId: areaId ? Number(areaId) : undefined,
      rangeId: rangeId ? Number(rangeId) : undefined,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
    }

    // eslint-disable-next-line no-console
    console.log(payload)
  }

  console.log('subChannels', subChannels)
  console.log('areas', areas)
  console.log('ranges', ranges)

  return (
    <>
      <Select value={subChannelId} onValueChange={setSubChannelId}>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Select Sub Channel' />
        </SelectTrigger>
        <SelectContent>
          {subChannels?.map((sc) => (
            <SelectItem key={sc.id} value={String(sc.id)}>
              {sc.channelName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={areaId} onValueChange={setAreaId}>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Select Area' />
        </SelectTrigger>
        <SelectContent>
          {areas?.map((a) => (
            <SelectItem key={a.id} value={String(a.id)}>
              {a.areaName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={rangeId} onValueChange={setRangeId}>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Select Range' />
        </SelectTrigger>
        <SelectContent>
          {ranges?.map((r) => (
            <SelectItem key={r.id} value={String(r.id)}>
              {r.rangeName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={year} onValueChange={setYear}>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Select Year' />
        </SelectTrigger>
        <SelectContent>
          {yearOptions.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={month} onValueChange={setMonth}>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Select Month' />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((m) => (
            <SelectItem key={m.value} value={String(m.value)}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant='default' onClick={handleApply}>
        Apply Filters
      </Button>
    </>
  )
}

export default Filters
