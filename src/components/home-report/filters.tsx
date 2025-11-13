import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '../ui/button'

const filters = () => {
  return (
    <>
      <Select>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Select Sub Channel' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='1'>Channel 1</SelectItem>
          <SelectItem value='2'>Channel 2</SelectItem>
          <SelectItem value='3'>Channel 3</SelectItem>
          <SelectItem value='3'>Channel 4</SelectItem>
          <SelectItem value='3'>Channel 5</SelectItem>
        </SelectContent>
      </Select>
      <Select>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Select Area' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='1'>Area 1</SelectItem>
          <SelectItem value='2'>Area 2</SelectItem>
          <SelectItem value='3'>Area 3</SelectItem>
          <SelectItem value='3'>Area 4</SelectItem>
          <SelectItem value='3'>Area 5</SelectItem>
        </SelectContent>
      </Select>
      <Select>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Select Range' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='1'>Range 1</SelectItem>
          <SelectItem value='2'>Range 2</SelectItem>
          <SelectItem value='3'>Range 3</SelectItem>
          <SelectItem value='3'>Range 4</SelectItem>
          <SelectItem value='3'>Range 5</SelectItem>
        </SelectContent>
      </Select>
      <Select>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Select Year' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='1'>2020</SelectItem>
          <SelectItem value='2'>2021</SelectItem>
          <SelectItem value='3'>2022</SelectItem>
          <SelectItem value='3'>2023</SelectItem>
          <SelectItem value='3'>2024</SelectItem>
        </SelectContent>
      </Select>
      <Select>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Select Month' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='1'>January</SelectItem>
          <SelectItem value='2'>Febvery</SelectItem>
          <SelectItem value='3'>March</SelectItem>
          <SelectItem value='3'>Apprial</SelectItem>
          <SelectItem value='3'>May</SelectItem>
        </SelectContent>
      </Select>
      <Button variant='default'>Apply Filters</Button>
    </>
  )
}

export default filters
