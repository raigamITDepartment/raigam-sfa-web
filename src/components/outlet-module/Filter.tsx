import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const areaOptions = ['Bakery Western', 'Bakery Eastern', 'Bakery Southern']
const territoryOptions = ['Negombo B', 'Colombo A', 'Galle A']
const routeOptions = ['Bakery - Thoppuwa to pan...', 'Bakery - City Route']
const approvalOptions = ['All', 'Approved', 'Pending', 'Rejected']

export function OutletFilter() {
  const [area, setArea] = useState<string | undefined>(undefined)
  const [territory, setTerritory] = useState<string | undefined>(undefined)
  const [route, setRoute] = useState<string | undefined>(undefined)
  const [approvalStatus, setApprovalStatus] = useState('All')

  return (
    <div className='rounded-sm border bg-white p-4 shadow-sm'>
      <div className='flex flex-wrap items-center gap-3'>
        <div className='flex min-w-[200px] flex-1 flex-col gap-2'>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger className='h-11 w-full rounded-sm'>
              <SelectValue placeholder='Select Area' />
            </SelectTrigger>
            <SelectContent>
              {areaOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex min-w-[200px] flex-1 flex-col gap-2'>
          <Select value={territory} onValueChange={setTerritory}>
            <SelectTrigger className='h-11 w-full rounded-sm'>
              <SelectValue placeholder='Select Territory' />
            </SelectTrigger>
            <SelectContent>
              {territoryOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex min-w-[220px] flex-1 flex-col gap-2'>
          <Select value={route} onValueChange={setRoute}>
            <SelectTrigger className='h-11 w-full rounded-sm'>
              <SelectValue placeholder='Select Route' />
            </SelectTrigger>
            <SelectContent>
              {routeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex min-w-[200px] flex-1 flex-col gap-2'>
          <Select value={approvalStatus} onValueChange={setApprovalStatus}>
            <SelectTrigger className='h-11 w-full rounded-sm'>
              <SelectValue placeholder='Approval Status' />
            </SelectTrigger>
            <SelectContent>
              {approvalOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-full flex-wrap items-center gap-3 sm:w-auto sm:flex-nowrap'>
          <Button className='h-9 rounded-sm px-6'>Apply Filters</Button>
          <Button variant='outline' className='h-9 rounded-sm px-6'>
            Reset All Filters
          </Button>
        </div>
      </div>
    </div>
  )
}
