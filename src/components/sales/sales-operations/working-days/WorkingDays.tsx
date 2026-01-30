import { useState } from 'react'
import { format } from 'date-fns'
import WorkingDaysCalendar from '@/components/sales/sales-operations/working-days/WorkingDaysCalendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const WorkingDays = () => {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const currentMonthLabel = format(currentDate, 'MMMM')

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base font-semibold'>
          {currentMonthLabel} month working days
        </CardTitle>
      </CardHeader>
      <CardContent className='w-full'>
        <WorkingDaysCalendar
          currentDate={currentDate}
          onDateChange={setCurrentDate}
        />
      </CardContent>
    </Card>
  )
}

export default WorkingDays
