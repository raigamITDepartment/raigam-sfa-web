import { useCallback, useEffect, useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  type NavigateAction,
  type SlotInfo,
  type ToolbarProps,
  type View,
} from 'react-big-calendar'
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isAfter,
  isBefore,
  isWeekend,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { enUS } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { ApiResponse } from '@/types/common'
import {
  addWorkingDyasInMonth,
  findEntriesByYearAndMonth,
  updateWorkingDay,
  type AddWorkingDaysInMonthPayload,
  type UpdateWorkingDayPayload,
} from '@/services/reports/otherReportsApi'
import { useAppSelector } from '@/store/hooks'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS },
})

const viewOptions: Array<{ key: View; label: string }> = [
  { key: 'month', label: 'Month' },
  { key: 'agenda', label: 'Agenda' },
]

type WorkingDayCalendarEntry = {
  id: number
  workingYear?: number | null
  workingMonth?: number | null
  workingDate: string
  isWorkingDay?: boolean | null
  isHoliday?: boolean | null
  isActive?: boolean | null
}

type CalendarEvent = {
  id: number
  title: string
  start: Date
  end: Date
  allDay: boolean
  resource: WorkingDayCalendarEntry
}

type DayStatus = 'working' | 'holiday' | 'off'

type DaySelection = {
  date: Date
  status: DayStatus
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiResponse<unknown> | undefined
    return data?.message || error.message || fallback
  }
  if (error instanceof Error) return error.message
  return fallback
}

const WorkingDaysToolbar = ({
  label,
  onNavigate,
  onView,
  view,
}: ToolbarProps) => {
  const setView = (next: string) => onView?.(next as View)

  return (
    <div className='mb-3 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center'>
      <div className='flex flex-wrap items-center gap-2'>
        <Button
          variant='outline'
          className='h-8 px-3'
          onClick={() => onNavigate?.('TODAY' as NavigateAction)}
        >
          Today
        </Button>
        <Button
          variant='outline'
          className='h-8 px-3'
          onClick={() => onNavigate?.('PREV' as NavigateAction)}
        >
          Back
        </Button>
        <Button
          variant='outline'
          className='h-8 px-3'
          onClick={() => onNavigate?.('NEXT' as NavigateAction)}
        >
          Next
        </Button>
      </div>
      <div className='text-center text-sm font-semibold'>{label}</div>
      <div className='flex justify-start lg:justify-end'>
        <Tabs value={view} onValueChange={setView}>
          <TabsList className='h-8'>
            {viewOptions.map((option) => (
              <TabsTrigger
                key={option.key}
                value={option.key}
                className='px-3 text-xs'
              >
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}

type WorkingDaysCalendarProps = {
  currentDate: Date
  onDateChange: (date: Date) => void
}

const WorkingDaysCalendar = ({
  currentDate,
  onDateChange,
}: WorkingDaysCalendarProps) => {
  const [currentView, setCurrentView] = useState<View>('month')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [daySelections, setDaySelections] = useState<DaySelection[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<DayStatus>('working')
  const [selectedEntryId, setSelectedEntryId] = useState<number | string | null>(
    null
  )
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1
  const monthLabel = format(currentDate, 'MMMM yyyy')
  const today = useMemo(() => startOfDay(new Date()), [])
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1
  const handleNavigate = (
    date: Date,
    _view: View,
    _action: NavigateAction
  ) => {
    onDateChange(date)
  }

  const { data: entries = [], isFetched } = useQuery({
    queryKey: ['working-day-calendar', year, month],
    queryFn: async () => {
      const res = (await findEntriesByYearAndMonth(
        year,
        month
      )) as ApiResponse<WorkingDayCalendarEntry[]>
      return res.payload ?? []
    },
    placeholderData: (prev) => prev ?? [],
    staleTime: 5 * 60 * 1000,
  })

  const entriesByDate = useMemo(() => {
    const map = new Map<string, WorkingDayCalendarEntry>()
    entries.forEach((entry) => {
      if (!entry.workingDate) return
      const parsed = new Date(`${entry.workingDate}T00:00:00`)
      const key = Number.isNaN(parsed.getTime())
        ? entry.workingDate
        : format(parsed, 'yyyy-MM-dd')
      map.set(key, entry)
    })
    return map
  }, [entries])

  const isEditableDate = useCallback(
    (date: Date) => !isCurrentMonth || !isBefore(date, today),
    [isCurrentMonth, today]
  )

  const buildDaySelections = useCallback(
    (targetDate: Date) => {
      const hasEntries = entriesByDate.size > 0
      const isTargetCurrentMonth =
        targetDate.getFullYear() === today.getFullYear() &&
        targetDate.getMonth() === today.getMonth()
      const start = startOfMonth(targetDate)
      const end = endOfMonth(targetDate)
      return eachDayOfInterval({ start, end }).map((day) => {
        const key = format(day, 'yyyy-MM-dd')
        const existing = entriesByDate.get(key)
        let status: DayStatus
        if (!hasEntries) {
          status = 'working'
        } else if (existing?.isHoliday) {
          status = 'holiday'
        } else if (existing?.isWorkingDay) {
          status = 'working'
        } else if (existing) {
          status = 'off'
        } else if (isTargetCurrentMonth && isBefore(day, today)) {
          status = 'off'
        } else {
          status = isWeekend(day) ? 'holiday' : 'working'
        }
        return { date: day, status }
      })
    },
    [entriesByDate, today]
  )

  useEffect(() => {
    if (!dialogOpen) return
    setDaySelections(buildDaySelections(currentDate))
  }, [buildDaySelections, currentDate, dialogOpen])

  const statusSummary = useMemo(() => {
    return daySelections.reduce(
      (acc, item) => {
        acc.total += 1
        acc[item.status] += 1
        return acc
      },
      { working: 0, holiday: 0, off: 0, total: 0 }
    )
  }, [daySelections])

  const addMonthMutation = useMutation({
    mutationFn: (payload: AddWorkingDaysInMonthPayload) =>
      addWorkingDyasInMonth(payload),
    onSuccess: async (res) => {
      toast.success(res?.message ?? 'Working days saved successfully.')
      setDialogOpen(false)
      await queryClient.invalidateQueries({
        queryKey: ['working-day-calendar', year, month],
      })
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(
        error,
        'Failed to save working days.'
      )
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateWorkingDayPayload) => updateWorkingDay(payload),
    onSuccess: async (res) => {
      toast.success(res?.message ?? 'Day updated successfully.')
      setUpdateDialogOpen(false)
      await queryClient.invalidateQueries({
        queryKey: ['working-day-calendar', year, month],
      })
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, 'Failed to update the day.')
      toast.error(message)
    },
  })

  const updateDayStatus = (index: number, status: DayStatus) => {
    setDaySelections((prev) =>
      prev.map((item, idx) =>
        idx === index && isEditableDate(item.date)
          ? { ...item, status }
          : item
      )
    )
  }

  const setAllDays = (status: DayStatus) => {
    setDaySelections((prev) =>
      prev.map((item) =>
        isEditableDate(item.date) ? { ...item, status } : item
      )
    )
  }

  const handleSave = async () => {
    const userId = user?.userId
    if (!userId) {
      toast.error('User id is required to save working days.')
      return
    }
    if (!daySelections.length) {
      toast.error('No days available for the selected month.')
      return
    }

    const payload: AddWorkingDaysInMonthPayload = {
      userId,
      workingYear: year,
      workingMonth: month,
      dayCalendarDTOList: daySelections.map((item) => ({
        workingDate: format(item.date, 'yyyy-MM-dd'),
        isWorkingDay: item.status === 'working',
        isHoliday: item.status === 'holiday',
        isActive: true,
      })),
    }

    await addMonthMutation.mutateAsync(payload)
  }

  const openUpdateDialog = useCallback(
    (date: Date) => {
      const key = format(date, 'yyyy-MM-dd')
      const entry = entriesByDate.get(key)
      const status = entry?.isHoliday
        ? 'holiday'
        : entry?.isWorkingDay
          ? 'working'
          : 'off'
      setSelectedDate(date)
      setSelectedEntryId(entry?.id ?? null)
      setSelectedStatus(status)
      setUpdateDialogOpen(true)
    },
    [entriesByDate]
  )

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    openUpdateDialog(slotInfo.start)
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    openUpdateDialog(event.start)
  }

  const handleUpdateDay = async () => {
    const userId = user?.userId
    if (!userId) {
      toast.error('User id is required to update working days.')
      return
    }
    if (!selectedDate || !selectedEntryId) {
      toast.error('No working day entry found for the selected date.')
      return
    }
    if (!isEditableDate(selectedDate)) {
      toast.error(
        'Only today and upcoming days can be updated for the current month.'
      )
      return
    }

    const payload: UpdateWorkingDayPayload = {
      id: selectedEntryId,
      userId,
      workingYear: year,
      workingMonth: month,
      workingDate: format(selectedDate, 'yyyy-MM-dd'),
      isWorkingDay: selectedStatus === 'working',
      isHoliday: selectedStatus === 'holiday',
      isActive: true,
    }

    await updateMutation.mutateAsync(payload)
  }

  const events = useMemo<CalendarEvent[]>(() => {
    return entries
      .filter((entry) => entry.isActive !== false)
      .map((entry) => {
        const start = new Date(`${entry.workingDate}T00:00:00`)
        const end = addDays(start, 1)
        const isHoliday = Boolean(entry.isHoliday)
        const isWorkingDay = Boolean(entry.isWorkingDay)
        const title = isHoliday
          ? 'Holiday'
          : isWorkingDay
            ? 'Working Day'
            : 'Off'
        return {
          id: entry.id,
          title,
          start,
          end,
          allDay: true,
          resource: entry,
        }
      })
  }, [entries])

  return (
    <div className='w-full rounded-sm border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900'>
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Update day status</DialogTitle>
            <DialogDescription>
              Change the working status for a single day.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='rounded-lg border bg-muted/30 px-4 py-3'>
              <p className='text-sm font-semibold'>
                {selectedDate
                  ? format(selectedDate, 'EEEE, MMMM d, yyyy')
                  : 'Select a day'}
              </p>
              <p className='text-xs text-muted-foreground'>
                {selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '-'}
              </p>
            </div>
            {!selectedEntryId && (
              <div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900'>
                This date has no calendar record yet. Add the month calendar
                first.
              </div>
            )}
            {selectedDate && !isEditableDate(selectedDate) && (
              <div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900'>
                Only today and upcoming days can be updated for the current
                month.
              </div>
            )}
            <div className='flex flex-wrap gap-2'>
              <Button
                size='sm'
                variant='outline'
                className={cn(
                  'h-8 px-3 text-xs',
                  selectedStatus === 'working' &&
                    'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-600'
                )}
                disabled={!selectedDate || !isEditableDate(selectedDate)}
                onClick={() => setSelectedStatus('working')}
              >
                Working day
              </Button>
              <Button
                size='sm'
                variant='outline'
                className={cn(
                  'h-8 px-3 text-xs',
                  selectedStatus === 'holiday' &&
                    'border-rose-600 bg-rose-600 text-white hover:bg-rose-600'
                )}
                disabled={!selectedDate || !isEditableDate(selectedDate)}
                onClick={() => setSelectedStatus('holiday')}
              >
                Holiday
              </Button>
              <Button
                size='sm'
                variant='outline'
                className={cn(
                  'h-8 px-3 text-xs',
                  selectedStatus === 'off' &&
                    'border-slate-600 bg-slate-600 text-white hover:bg-slate-600'
                )}
                disabled={!selectedDate || !isEditableDate(selectedDate)}
                onClick={() => setSelectedStatus('off')}
              >
                Rest day
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDay}
              disabled={
                updateMutation.isPending ||
                !selectedDate ||
                !selectedEntryId ||
                !isEditableDate(selectedDate)
              }
            >
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {isFetched && entries.length === 0 && (
          <Alert variant='info' className='mb-4'>
            <AlertTitle>
              No working days or holidays set for this month.
            </AlertTitle>
            <AlertDescription>
              <p>
                This month doesn’t have a working calendar yet. Add working
                days and holidays to get started.
              </p>
              <DialogTrigger asChild>
                <Button className='mt-2' size='sm'>
                  Add working days & holidays
                </Button>
              </DialogTrigger>
            </AlertDescription>
          </Alert>
        )}
        <DialogContent className='sm:max-w-5xl'>
          <DialogHeader>
            <DialogTitle>Set working days & holidays</DialogTitle>
            <DialogDescription>
              Define the working calendar for {monthLabel}.
            </DialogDescription>
          </DialogHeader>
          {isCurrentMonth && (
            <div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900'>
              Today and upcoming days can be changed for the current month.
            </div>
          )}
          <div className='grid gap-4 lg:grid-cols-[260px_1fr]'>
            <div className='space-y-4'>
              <div className='rounded-lg border bg-muted/30 p-4'>
                <p className='text-sm font-semibold'>Summary</p>
                <div className='mt-3 flex flex-wrap gap-2'>
                  <Badge className='bg-emerald-600 text-white'>
                    Working: {statusSummary.working}
                  </Badge>
                  <Badge className='bg-rose-600 text-white'>
                    Holidays: {statusSummary.holiday}
                  </Badge>
                  <Badge variant='secondary'>Off: {statusSummary.off}</Badge>
                  <Badge variant='outline'>
                    Total: {statusSummary.total}
                  </Badge>
                </div>
              </div>
              <div className='rounded-lg border p-4'>
                <p className='text-sm font-semibold'>Quick actions</p>
                <p className='mt-1 text-xs text-muted-foreground'>
                  Apply common schedules in one click.
                </p>
                <div className='mt-3 grid gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setAllDays('working')}
                  >
                    Mark all as working days
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setAllDays('holiday')}
                  >
                    Mark all as holidays
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setAllDays('off')}
                  >
                    Clear all selections
                  </Button>
                </div>
              </div>
              <div className='rounded-lg border p-4 text-xs text-muted-foreground'>
                <p className='font-semibold text-foreground'>
                  Status meaning
                </p>
                <div className='mt-2 space-y-1'>
                  <p>
                    <span className='font-medium text-emerald-700'>
                      Working day
                    </span>{' '}
                    — normal operating day.
                  </p>
                  <p>
                    <span className='font-medium text-rose-700'>Holiday</span>{' '}
                    — non-working holiday.
                  </p>
                  <p>
                    <span className='font-medium text-slate-700'>Off</span> —
                    excluded from the calendar.
                  </p>
                </div>
              </div>
            </div>
            <div className='rounded-lg border'>
              <div className='flex items-center justify-between px-4 py-3'>
                <div>
                  <p className='text-sm font-semibold'>{monthLabel}</p>
                  <p className='text-xs text-muted-foreground'>
                    Select a status for each day
                  </p>
                </div>
                <Badge variant='outline'>
                  {statusSummary.total} days
                </Badge>
              </div>
              <Separator />
              <ScrollArea className='h-[440px]'>
                <div className='divide-y'>
                  {daySelections.map((item, index) => {
                    const dateLabel = format(item.date, 'EEE, MMM d')
                    const dateKey = format(item.date, 'yyyy-MM-dd')
                    const isWorking = item.status === 'working'
                    const isHoliday = item.status === 'holiday'
                    const isOff = item.status === 'off'
                    const editable = isEditableDate(item.date)
                    return (
                      <div
                        key={dateKey}
                        className={cn(
                          'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
                          !editable && 'bg-muted/40 text-muted-foreground'
                        )}
                      >
                        <div>
                          <p className='text-sm font-medium'>{dateLabel}</p>
                          <p className='text-xs text-muted-foreground'>
                            {dateKey}
                          </p>
                          {!editable && (
                            <Badge variant='secondary' className='mt-2'>
                              Locked
                            </Badge>
                          )}
                        </div>
                        <div className='flex flex-wrap items-center gap-2'>
                          <Button
                            size='sm'
                            variant='outline'
                            className={cn(
                              'h-8 px-3 text-xs',
                              isWorking &&
                                'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-600'
                            )}
                            disabled={!editable}
                            onClick={() => updateDayStatus(index, 'working')}
                          >
                            Working
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            className={cn(
                              'h-8 px-3 text-xs',
                              isHoliday &&
                                'border-rose-600 bg-rose-600 text-white hover:bg-rose-600'
                            )}
                            disabled={!editable}
                            onClick={() => updateDayStatus(index, 'holiday')}
                          >
                            Holiday
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            className={cn(
                              'h-8 px-3 text-xs',
                              isOff &&
                                'border-slate-600 bg-slate-600 text-white hover:bg-slate-600'
                            )}
                            disabled={!editable}
                            onClick={() => updateDayStatus(index, 'off')}
                          >
                            Off
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={addMonthMutation.isPending}>
              {addMonthMutation.isPending
                ? 'Saving...'
                : 'Save working calendar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className='h-[720px] w-full'>
        <BigCalendar<CalendarEvent>
          localizer={localizer}
          events={events}
          startAccessor='start'
          endAccessor='end'
          date={currentDate}
          view={currentView}
          onView={setCurrentView}
          onNavigate={handleNavigate}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          views={viewOptions.map((option) => option.key)}
          components={{ toolbar: WorkingDaysToolbar }}
          dayPropGetter={(date) => {
            const key = format(date, 'yyyy-MM-dd')
            const entry = entriesByDate.get(key)
            if (!entry) return {}
            if (entry.isHoliday) {
              return { style: { backgroundColor: '#FEF2F2' } }
            }
            if (entry.isWorkingDay) {
              return { style: { backgroundColor: '#ECFDF3' } }
            }
            return {}
          }}
          eventPropGetter={(event) => {
            const entry = event.resource
            if (entry?.isHoliday) {
              return {
                style: {
                  backgroundColor: '#FEE2E2',
                  color: '#991B1B',
                  border: '1px solid #FECACA',
                },
              }
            }
            return {
              style: {
                backgroundColor: '#DCFCE7',
                color: '#166534',
                border: '1px solid #BBF7D0',
              },
            }
          }}
          className='working-days-calendar h-full w-full'
          style={{ height: 720 }}
        />
      </div>
    </div>
  )
}

export default WorkingDaysCalendar
