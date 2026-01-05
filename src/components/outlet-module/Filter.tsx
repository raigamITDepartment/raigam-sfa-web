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
import { getAllChannel } from '@/services/userDemarcation/endpoints'
import type { ApiResponse } from '@/types/common'
import type { ChannelDTO } from '@/types/demarcation'

type OutletFilterValues = {
  channelId?: string
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
  const [channel, setChannel] = useState<string>(
    initialValues?.channelId ?? ''
  )

  const { data: channels = [], isLoading: isChannelLoading } = useQuery({
    queryKey: ['user-demarcation', 'channels'],
    queryFn: async () => {
      const res = (await getAllChannel()) as ApiResponse<ChannelDTO[]>
      return res.payload ?? []
    },
  })

  const handleApply = () => {
    onApply?.({
      channelId: channel,
    })
  }

  const handleReset = () => {
    setChannel('')
    onReset?.()
  }

  return (
    <div className='rounded-sm border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900'>
      <div className='flex flex-wrap items-center gap-3 md:flex-nowrap'>
        <div className='flex w-[240px] flex-none flex-col gap-2'>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className='h-11 w-full rounded-sm'>
              <SelectValue placeholder='Select Channel' />
            </SelectTrigger>
            <SelectContent>
              {isChannelLoading ? (
                <SelectItem value='loading' disabled>
                  Loading...
                </SelectItem>
              ) : (
                channels.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.channelName ?? option.channelCode ?? String(option.id)}
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
