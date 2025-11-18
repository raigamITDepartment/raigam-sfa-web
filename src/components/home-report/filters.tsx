import { useEffect, useMemo, useState } from 'react'
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

// Mapping of Sub Channel ID -> allowed Range IDs
const subChannelRangeMap: Record<number, number[]> = {
  1: [1, 3],
  2: [2, 3],
  3: [4],
  4: [6],
  5: [7],
  6: [9],
  7: [8],
}

type FiltersPayload = {
  subChannelId?: number
  areaId?: number
  rangeId?: number
  year?: number
  month?: number
}

type FiltersProps = {
  onApply?: (payload: FiltersPayload) => void
}

function Filters({ onApply }: FiltersProps) {
  const [subChannelId, setSubChannelId] = useState<string>('')
  const [areaId, setAreaId] = useState<string>('0')
  const [rangeId, setRangeId] = useState<string>('')
  const [year, setYear] = useState<string>('')
  const [month, setMonth] = useState<string>('')
  const [errors, setErrors] = useState({
    subChannelId: false,
    rangeId: false,
    year: false,
    month: false,
  })

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

  const { data: ranges } = useQuery({
    queryKey: ['user-demarcation', 'ranges'],
    queryFn: async () => {
      const res = (await getAllRange()) as ApiResponse<RangeDTO[]>
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

  const handleApply = () => {
    const nextErrors = {
      subChannelId: !subChannelId,
      rangeId: !rangeId,
      year: !year,
      month: !month,
    }

    const hasError =
      nextErrors.subChannelId ||
      nextErrors.rangeId ||
      nextErrors.year ||
      nextErrors.month

    if (hasError) {
      setErrors(nextErrors)
      return
    }

    setErrors({
      subChannelId: false,
      rangeId: false,
      year: false,
      month: false,
    })

    const payload: FiltersPayload = {
      subChannelId: subChannelId ? Number(subChannelId) : undefined,
      areaId: areaId ? Number(areaId) : undefined,
      rangeId: rangeId ? Number(rangeId) : undefined,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
    }

    onApply?.(payload)
  }

  const handleReset = () => {
    // Reset local state
    setSubChannelId('')
    setRangeId('')
    setAreaId('0')
    setYear('')
    setMonth('')
    setErrors({
      subChannelId: false,
      rangeId: false,
      year: false,
      month: false,
    })

    // Trigger reload with cleared filters; areaId explicitly 0 = All Areas
    const payload: FiltersPayload = {
      subChannelId: undefined,
      areaId: 0,
      rangeId: undefined,
      year: undefined,
      month: undefined,
    }
    onApply?.(payload)
  }

  // Derive allowed ranges based on selected subChannel
  const filteredRanges = useMemo(() => {
    if (!ranges) return [] as RangeDTO[]
    if (!subChannelId) return ranges
    const allowed = subChannelRangeMap[Number(subChannelId)] || []
    return ranges.filter((r) => {
      const optionId = r.id ?? r.rangeId
      if (optionId === undefined || optionId === null) return false
      return allowed.includes(Number(optionId))
    })
  }, [ranges, subChannelId])

  // Clear selected range when sub channel changes to avoid invalid selection
  useEffect(() => {
    setRangeId('')
    setErrors((prev) => ({ ...prev, subChannelId: false, rangeId: false }))
  }, [subChannelId])

  // Change handlers that also clear any prior error for the field
  const onChangeSubChannel = (val: string) => {
    setSubChannelId(val)
    setErrors((prev) => ({ ...prev, subChannelId: false }))
  }
  const onChangeRange = (val: string) => {
    setRangeId(val)
    setErrors((prev) => ({ ...prev, rangeId: false }))
  }
  const onChangeYear = (val: string) => {
    setYear(val)
    setErrors((prev) => ({ ...prev, year: false }))
  }
  const onChangeMonth = (val: string) => {
    setMonth(val)
    setErrors((prev) => ({ ...prev, month: false }))
  }
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8'>
      {/* Sub Channel */}
      <Select value={subChannelId} onValueChange={onChangeSubChannel}>
        <SelectTrigger className='w-full' aria-invalid={errors.subChannelId}>
          <SelectValue placeholder='Select Sub Channel' />
        </SelectTrigger>
        <SelectContent>
          {subChannels?.map((sc) => (
            <SelectItem key={sc.id} value={String(sc.id)}>
              {sc.subChannelName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Range */}
      <Select value={rangeId} onValueChange={onChangeRange}>
        <SelectTrigger className='w-full' aria-invalid={errors.rangeId}>
          <SelectValue placeholder='Select Range' />
        </SelectTrigger>
        <SelectContent>
          {filteredRanges?.map((r, index) => {
            const optionId = r.id ?? r.rangeId
            if (optionId === undefined || optionId === null) return null
            return (
              <SelectItem key={`${optionId}-${index}`} value={String(optionId)}>
                {r.rangeName ?? `Range ${optionId}`}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      {/* Area */}
      <Select value={areaId} onValueChange={setAreaId}>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Select Area' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='0'>All Areas</SelectItem>
          {areas?.map((a) => (
            <SelectItem key={a.id} value={String(a.id)}>
              {a.areaName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Year */}
      <Select value={year} onValueChange={onChangeYear}>
        <SelectTrigger className='w-full' aria-invalid={errors.year}>
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

      {/* Month */}
      <Select value={month} onValueChange={onChangeMonth}>
        <SelectTrigger className='w-full' aria-invalid={errors.month}>
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

      {/* Apply Button */}
      <Button
        variant='default'
        onClick={handleApply}
        className='w-full sm:col-span-2 md:col-span-1'
      >
        Apply Filters
      </Button>

      {/* Reset Button */}
      <Button
        variant='outline'
        onClick={handleReset}
        className='w-full sm:col-span-2 md:col-span-1'
      >
        Reset All Filters
      </Button>
    </div>
  )
}

export default Filters
