import { useEffect, useMemo, useRef } from 'react'
import { z } from 'zod'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import {
  getAllRange,
  getAllSubChannel,
  getAreasBySubChannelId,
  type AreaDTO,
  type RangeDTO,
  type SubChannelDTO,
} from '@/services/userDemarcationApi'
import { CalendarIcon, Loader2 } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const achievementFilterSchema = z.object({
  subChannelId: z.string().min(1, 'Please select sub channel'),
  rangeId: z.string().min(1, 'Please select range'),
  areaId: z.string().min(1, 'Please select area'),
  template: z.string().min(1, 'Please select template'),
  dateRange: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .refine((value) => value.from && value.to, {
      message: 'Please select date range',
    }),
})

export type AchievementFilterValues = z.output<typeof achievementFilterSchema>
type AchievementFilterInput = z.input<typeof achievementFilterSchema>

type AchievementFilterProps = {
  onGenerateReport?: (values: AchievementFilterValues) => void | Promise<void>
  onReset?: () => void
}

type TemplateOption = {
  label: string
  value: string
}

type TemplateGroup = {
  category: string
  options: TemplateOption[]
}

const templateFiles = import.meta.glob('/public/templates/**/*', {
  eager: true,
  import: 'default',
  query: '?url',
})

const TEMPLATE_GROUPS: TemplateGroup[] = Object.keys(templateFiles)
  .map((fullPath) => fullPath.replace('/public/templates/', ''))
  .filter((relativePath) => {
    if (!relativePath) return false
    const segments = relativePath.split('/')
    if (segments.some((segment) => segment.startsWith('.'))) return false
    const filename = segments[segments.length - 1]
    return filename.includes('.')
  })
  .map((relativePath) => {
    const segments = relativePath.split('/')
    const filename = segments.pop() as string
    const category = segments.length ? segments.join(' / ') : 'Templates'
    const label = filename.replace(/\.[^.]+$/, '')
    const value = `/templates/${relativePath}`
    return { category, label, value }
  })
  .sort((a, b) => {
    const categoryCompare = a.category.localeCompare(b.category)
    if (categoryCompare !== 0) return categoryCompare
    return a.label.localeCompare(b.label)
  })
  .reduce<TemplateGroup[]>((acc, current) => {
    const existingGroup = acc.find((item) => item.category === current.category)
    if (existingGroup) {
      existingGroup.options.push({
        label: current.label,
        value: current.value,
      })
      return acc
    }
    acc.push({
      category: current.category,
      options: [{ label: current.label, value: current.value }],
    })
    return acc
  }, [])

const subChannelRangeMap: Record<number, number[]> = {
  1: [1, 3],
  2: [2, 3],
  3: [4],
  4: [6],
  5: [7],
  6: [9],
  7: [8],
}

const DEFAULT_VALUES: AchievementFilterInput = {
  subChannelId: '',
  rangeId: '',
  areaId: '',
  template: '',
  dateRange: { from: undefined, to: undefined },
}

export default function AchievementFilter({
  onGenerateReport,
  onReset,
}: AchievementFilterProps) {
  const controlHeight = 'h-9 min-h-[36px]'
  const form = useForm<AchievementFilterInput, any, AchievementFilterValues>({
    resolver: zodResolver(achievementFilterSchema),
    defaultValues: DEFAULT_VALUES,
  })
  const isSubmitting = form.formState.isSubmitting

  const selectedSubChannelId = form.watch('subChannelId')
  const previousSubChannelId = useRef<string>('')

  const { data: subChannelResponse, isLoading: loadingSubChannels } = useQuery({
    queryKey: ['achievement-filter', 'sub-channels'],
    queryFn: getAllSubChannel,
  })

  const { data: rangeResponse, isLoading: loadingRanges } = useQuery({
    queryKey: ['achievement-filter', 'ranges'],
    queryFn: getAllRange,
  })

  const {
    data: areaResponse,
    isLoading: loadingAreas,
    isFetching: fetchingAreas,
  } = useQuery({
    queryKey: ['achievement-filter', 'areas', selectedSubChannelId],
    enabled: Boolean(selectedSubChannelId),
    queryFn: () => getAreasBySubChannelId(selectedSubChannelId),
  })

  useEffect(() => {
    if (previousSubChannelId.current === selectedSubChannelId) return
    if (previousSubChannelId.current) {
      form.setValue('areaId', '')
      form.setValue('rangeId', '')
      form.clearErrors('areaId')
      form.clearErrors('rangeId')
    }
    previousSubChannelId.current = selectedSubChannelId
  }, [form, selectedSubChannelId])

  const subChannels = useMemo(
    () =>
      Array.isArray(subChannelResponse?.payload)
        ? subChannelResponse.payload
        : [],
    [subChannelResponse]
  ) as SubChannelDTO[]

  const ranges = useMemo(
    () => (Array.isArray(rangeResponse?.payload) ? rangeResponse.payload : []),
    [rangeResponse]
  ) as RangeDTO[]

  const filteredRanges = useMemo(() => {
    if (!ranges.length) return [] as RangeDTO[]
    if (!selectedSubChannelId) return ranges
    const allowed = subChannelRangeMap[Number(selectedSubChannelId)] ?? []
    if (!allowed.length) return ranges
    return ranges.filter((rangeItem) => {
      const id = rangeItem.id ?? rangeItem.rangeId
      if (id === undefined || id === null) return false
      return allowed.includes(Number(id))
    })
  }, [ranges, selectedSubChannelId])

  const areas = useMemo(
    () => (Array.isArray(areaResponse?.payload) ? areaResponse.payload : []),
    [areaResponse]
  ) as AreaDTO[]

  const handleSubmit = async (values: AchievementFilterValues) => {
    if (!values.dateRange.from || !values.dateRange.to) return
    await onGenerateReport?.(values)
  }

  const handleReset = () => {
    form.reset(DEFAULT_VALUES)
    onReset?.()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className='flex flex-wrap items-start gap-2'>
          <div className='flex w-full min-w-[180px] flex-1 flex-col gap-1 sm:min-w-[200px]'>
            <FormField
              control={form.control}
              name='subChannelId'
              render={({ field, fieldState }) => (
                <FormItem>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loadingSubChannels}
                  >
                    <FormControl>
                      <SelectTrigger
                        className={cn(
                          controlHeight,
                          'w-full bg-slate-50 text-left',
                          fieldState.invalid
                            ? 'border-red-500 text-red-600'
                            : ''
                        )}
                      >
                        <SelectValue placeholder='Select sub channel' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingSubChannels ? (
                        <SelectItem value='__loading_sub_channel__' disabled>
                          Loading...
                        </SelectItem>
                      ) : (
                        subChannels.map((subChannel) => (
                          <SelectItem
                            key={subChannel.id}
                            value={String(subChannel.id)}
                          >
                            {subChannel.subChannelName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage className='px-1 text-xs' />
                </FormItem>
              )}
            />
          </div>

          <div className='flex w-full min-w-[180px] flex-1 flex-col gap-1 sm:min-w-[200px]'>
            <FormField
              control={form.control}
              name='rangeId'
              render={({ field, fieldState }) => (
                <FormItem>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!selectedSubChannelId || loadingRanges}
                  >
                    <FormControl>
                      <SelectTrigger
                        className={cn(
                          controlHeight,
                          'w-full bg-slate-50 text-left',
                          fieldState.invalid
                            ? 'border-red-500 text-red-600'
                            : ''
                        )}
                      >
                        <SelectValue placeholder='Select range' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingRanges ? (
                        <SelectItem value='__loading_range__' disabled>
                          Loading...
                        </SelectItem>
                      ) : (
                        filteredRanges.map((range) => (
                          <SelectItem
                            key={String(range.id ?? range.rangeId)}
                            value={String(range.id ?? range.rangeId)}
                          >
                            {range.rangeName ??
                              `Range ${range.id ?? range.rangeId}`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage className='px-1 text-xs' />
                </FormItem>
              )}
            />
          </div>

          <div className='flex w-full min-w-[180px] flex-1 flex-col gap-1 sm:min-w-[200px]'>
            <FormField
              control={form.control}
              name='areaId'
              render={({ field, fieldState }) => (
                <FormItem>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={
                      !selectedSubChannelId || loadingAreas || fetchingAreas
                    }
                  >
                    <FormControl>
                      <SelectTrigger
                        className={cn(
                          controlHeight,
                          'w-full bg-slate-50 text-left',
                          fieldState.invalid
                            ? 'border-red-500 text-red-600'
                            : ''
                        )}
                      >
                        <SelectValue placeholder='Select area' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingAreas || fetchingAreas ? (
                        <SelectItem value='__loading_area__' disabled>
                          Loading...
                        </SelectItem>
                      ) : (
                        areas.map((area) => (
                          <SelectItem
                            key={String(area.id)}
                            value={String(area.id)}
                          >
                            {area.areaName ?? `Area ${area.id}`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage className='px-1 text-xs' />
                </FormItem>
              )}
            />
          </div>

          <div className='flex w-full min-w-[180px] flex-1 flex-col gap-1 sm:min-w-[220px]'>
            <FormField
              control={form.control}
              name='dateRange'
              render={({ field, fieldState }) => {
                const selectedRange = (field.value ?? {}) as DateRange
                const hasRange = Boolean(selectedRange.from || selectedRange.to)
                return (
                  <FormItem>
                    <Popover>
                      <FormControl>
                        <PopoverTrigger asChild>
                          <Button
                            type='button'
                            variant='outline'
                            className={cn(
                              controlHeight,
                              'w-full justify-between bg-slate-50 text-left font-normal',
                              !hasRange ? 'text-muted-foreground' : '',
                              fieldState.invalid
                                ? 'border-red-500 text-red-600'
                                : ''
                            )}
                          >
                            <span className='truncate'>
                              {selectedRange?.from && selectedRange?.to
                                ? `${format(selectedRange.from, 'yyyy-MM-dd')} ~ ${format(selectedRange.to, 'yyyy-MM-dd')}`
                                : 'Select date range'}
                            </span>

                            <CalendarIcon className='h-4 w-4 opacity-60' />
                          </Button>
                        </PopoverTrigger>
                      </FormControl>
                      <PopoverContent className='w-auto p-0' align='start'>
                        <Calendar
                          mode='range'
                          captionLayout='dropdown'
                          numberOfMonths={2}
                          selected={selectedRange}
                          onSelect={(value) =>
                            field.onChange({
                              from: value?.from,
                              to: value?.to,
                            })
                          }
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage className='px-1 text-xs' />
                  </FormItem>
                )
              }}
            />
          </div>

          <div className='flex w-full min-w-[180px] flex-1 flex-col gap-1 sm:min-w-[200px]'>
            <FormField
              control={form.control}
              name='template'
              render={({ field, fieldState }) => (
                <FormItem>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger
                        className={cn(
                          controlHeight,
                          'w-full bg-slate-50 text-left',
                          fieldState.invalid
                            ? 'border-red-500 text-red-600'
                            : ''
                        )}
                      >
                        <SelectValue placeholder='Select template' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TEMPLATE_GROUPS.length ? (
                        TEMPLATE_GROUPS.map((group) => (
                          <SelectGroup key={group.category}>
                            <SelectLabel>{group.category}</SelectLabel>
                            {group.options.map((template) => (
                              <SelectItem
                                key={template.value}
                                value={template.value}
                              >
                                {template.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))
                      ) : (
                        <SelectItem value='__no_templates__' disabled>
                          No templates found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage className='px-1 text-xs' />
                </FormItem>
              )}
            />
          </div>

          <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end'>
            <Button
              type='submit'
              className={cn(controlHeight, 'min-w-[150px]')}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='size-4 animate-spin' aria-hidden='true' />
                  <span>Generating...</span>
                </>
              ) : (
                'Generate Report'
              )}
            </Button>
            <Button
              type='button'
              variant='outline'
              className={cn(controlHeight, 'min-w-[150px]')}
              onClick={handleReset}
              disabled={isSubmitting}
            >
              Reset
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
