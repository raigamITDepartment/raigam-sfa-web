import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ApiResponse,
  type ChannelDTO,
  type AreaDTO,
  type RangeDTO,
  type SubChannelDTO,
  type TerritoryDTO,
  type CreateTerritoryRequest,
  type UpdateTerritoryRequest,
  type Id,
  getAllChannel,
  getAllArea,
  getAllRange,
  getAllSubChannel,
  createTerritory,
  updateTerritory,
} from '@/services/userDemarcationApi'
import { useAppSelector } from '@/store/hooks'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const territoryFormSchema = z.object({
  channelId: z.string().min(1, 'Please select a channel'),
  subChannelId: z.string().min(1, 'Please select a sub channel'),
  areaId: z.string().min(1, 'Please select an area'),
  rangeId: z.string().min(1, 'Please select a range'),
  displayOrder: z.coerce
    .number()
    .int('Display order must be an integer')
    .nonnegative('Display order must be positive'),
  territoryCode: z.string().min(1, 'Please enter territory code'),
  territoryName: z.string().min(1, 'Please enter territory name'),
  isActive: z.boolean().default(true),
  oldTerritoryId: z.string().optional(),
})

type TerritoryFormInput = z.input<typeof territoryFormSchema>
export type TerritoryFormValues = z.output<typeof territoryFormSchema>

type TerritoryFormProps = {
  mode: 'create' | 'edit'
  territoryId?: Id
  initialValues?: Partial<TerritoryFormValues>
  onSubmit?: (values: TerritoryFormValues) => void | Promise<void>
  onCancel?: () => void
}

export function TerritoryForm(props: TerritoryFormProps) {
  const { mode, territoryId, initialValues, onSubmit, onCancel } = props
  const queryClient = useQueryClient()
  const user = useAppSelector((s) => s.auth.user)

  const { data: channelsData } = useQuery({
    queryKey: ['channels', 'options'],
    queryFn: async () => {
      const res = (await getAllChannel()) as ApiResponse<ChannelDTO[]>
      return res.payload
    },
    initialData: () => {
      const existing = queryClient.getQueryData<ApiResponse<ChannelDTO[]>>([
        'channels',
      ])
      return existing?.payload
    },
  })

  const { data: subChannelsData } = useQuery({
    queryKey: ['sub-channels', 'options'],
    queryFn: async () => {
      const res = (await getAllSubChannel()) as ApiResponse<SubChannelDTO[]>
      return res.payload
    },
  })

  const { data: areasData } = useQuery({
    queryKey: ['areas', 'options'],
    queryFn: async () => {
      const res = (await getAllArea()) as ApiResponse<AreaDTO[]>
      return res.payload
    },
  })

  const { data: rangesData } = useQuery({
    queryKey: ['ranges', 'options'],
    queryFn: async () => {
      const res = (await getAllRange()) as ApiResponse<RangeDTO[]>
      return res.payload
    },
  })

  const form = useForm<TerritoryFormInput, any, TerritoryFormValues>({
    resolver: zodResolver(territoryFormSchema),
    defaultValues: {
      channelId: '',
      subChannelId: '',
      areaId: '',
      rangeId: '',
      displayOrder: 0,
      territoryCode: '',
      territoryName: '',
      isActive: true,
      oldTerritoryId: '',
      ...initialValues,
    },
  })

  useEffect(() => {
    const resolvedChannelId =
      initialValues?.channelId && String(initialValues.channelId)
        ? String(initialValues.channelId)
        : initialValues?.subChannelId && subChannelsData
          ? (() => {
              const match = subChannelsData.find(
                (sc) =>
                  String(sc.id ?? '') === String(initialValues.subChannelId ?? '')
              )
              return match?.channelId ? String(match.channelId) : ''
            })()
          : ''

    const defaults: TerritoryFormValues = {
      channelId: resolvedChannelId,
      subChannelId: '',
      areaId: '',
      rangeId: '',
      displayOrder: 0,
      territoryCode: '',
      territoryName: '',
      isActive: true,
      oldTerritoryId: '',
      ...(initialValues as TerritoryFormValues | undefined),
      ...(resolvedChannelId ? { channelId: resolvedChannelId } : {}),
    }
    form.reset(defaults)
  }, [initialValues, subChannelsData, form])

  const channelValue = form.watch('channelId')
  const subChannelValue = form.watch('subChannelId')
  const isEditMode = mode === 'edit'

  const activeChannels = useMemo(
    () =>
      channelsData?.filter((channel) => {
        const active =
          (channel.isActive as boolean | undefined) ??
          (channel.active as boolean | undefined) ??
          true
        const isSelected = String(channel.id ?? '') === channelValue
        return active || (isEditMode && isSelected)
      }) ?? [],
    [channelsData, channelValue, isEditMode]
  )

  const activeSubChannels = useMemo(
    () =>
      subChannelsData?.filter((item) => {
        const active =
          (item.isActive as boolean | undefined) ??
          (item.active as boolean | undefined) ??
          true
        const isSelected = String(item.id ?? '') === subChannelValue
        return active || (isEditMode && isSelected)
      }) ?? [],
    [subChannelsData, subChannelValue, isEditMode]
  )

  const activeAreas = useMemo(
    () =>
      areasData?.filter((item) => {
        const active =
          (item.isActive as boolean | undefined) ??
          (item.active as boolean | undefined) ??
          true
        return active
      }) ?? [],
    [areasData]
  )

  const activeRanges = useMemo(
    () =>
      rangesData?.filter((item) => {
        const active =
          (item as any).isActive as boolean | undefined ??
          ((item as any).active as boolean | undefined) ??
          true
        return active
      }) ?? [],
    [rangesData]
  )

  const filteredSubChannels = useMemo(() => {
    if (!activeSubChannels.length) return []
    if (!channelValue) return activeSubChannels
    return activeSubChannels.filter(
      (item) => String(item.channelId ?? '') === channelValue
    )
  }, [activeSubChannels, channelValue])

  const filteredRanges = useMemo(() => {
    if (!activeRanges.length) return []
    if (!subChannelValue) return activeRanges

    const subId = Number(subChannelValue)
    const map: Record<number, number[]> = {
      1: [1, 3],
      2: [2, 3],
      3: [4],
      4: [6],
      5: [7],
      6: [9],
      7: [8],
    }

    const allowed = map[subId]
    if (!allowed) return activeRanges

    return activeRanges.filter((r) => {
      const optionId = r.id ?? r.rangeId
      if (optionId === undefined || optionId === null) return false
      return allowed.includes(Number(optionId))
    })
  }, [activeRanges, subChannelValue])

  const createMutation = useMutation({
    mutationFn: async (values: TerritoryFormValues) => {
      const payload: CreateTerritoryRequest = {
        userId: user?.userId ?? 0,
        // channelId is optional in API body
        ...(values.channelId
          ? { channelId: Number(values.channelId) as Id }
          : {}),
        subChannelId: Number(values.subChannelId),
        rangeId: Number(values.rangeId),
        areaId: Number(values.areaId),
        territoryName: values.territoryName,
        territoryCode: values.territoryCode,
        displayOrder: values.displayOrder,
        oldTerritoryId: values.oldTerritoryId
          ? Number(values.oldTerritoryId)
          : 0,
        isActive: values.isActive,
      }
      return createTerritory(payload)
    },
    onSuccess: async (data, variables) => {
      toast.success('Territory created successfully')
      queryClient.setQueryData<ApiResponse<TerritoryDTO[]>>(
        ['territories'],
        (old) => {
          if (!old) {
            return {
              ...data,
              payload: [data.payload],
            }
          }
          if (!Array.isArray(old.payload)) return old
          return {
            ...old,
            payload: [data.payload, ...old.payload],
          }
        }
      )
      await onSubmit?.(variables)
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to create territory'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (input: { id: Id; values: TerritoryFormValues }) => {
      const { id, values } = input
      const payload: UpdateTerritoryRequest = {
        id,
        userId: user?.userId ?? 0,
        ...(values.channelId
          ? { channelId: Number(values.channelId) as Id }
          : {}),
        subChannelId: Number(values.subChannelId),
        rangeId: Number(values.rangeId),
        areaId: Number(values.areaId),
        territoryName: values.territoryName,
        territoryCode: values.territoryCode,
        displayOrder: values.displayOrder,
        isActive: values.isActive,
      }
      return updateTerritory(payload)
    },
    onSuccess: async (data, { values }) => {
      toast.success('Territory updated successfully')
      queryClient.setQueryData<ApiResponse<TerritoryDTO[]>>(
        ['territories'],
        (old) => {
          if (!old || !Array.isArray(old.payload)) return old
          return {
            ...old,
            payload: old.payload.map((item: any) =>
              String(item.id) === String(data.payload.id) ? data.payload : item
            ),
          }
        }
      )
      await onSubmit?.(values)
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to update territory'
      toast.error(message)
    },
  })

  const handleSubmit = async (values: TerritoryFormValues) => {
    if (mode === 'create') {
      await createMutation.mutateAsync(values)
    } else if (mode === 'edit' && territoryId != null) {
      await updateMutation.mutateAsync({ id: territoryId, values })
    } else {
      await onSubmit?.(values)
    }
  }

  const isSubmitting =
    form.formState.isSubmitting ||
    createMutation.isPending ||
    updateMutation.isPending
  const submitLabel = mode === 'create' ? 'Create' : 'Update'
  const submitVariant = 'default'

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className='flex flex-col gap-3'
      >
        {!isEditMode && (
          <FormField
            control={form.control}
            name='channelId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Channel</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                    disabled={isEditMode}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select Channel' />
                    </SelectTrigger>
                    <SelectContent>
                      {activeChannels.map((channel) => (
                        <SelectItem key={channel.id} value={String(channel.id)}>
                          {channel.channelName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name='subChannelId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Sub Channel</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                  disabled={isEditMode || !filteredSubChannels.length}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select Sub Channel' />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubChannels.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.subChannelName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='areaId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Area</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select Area' />
                  </SelectTrigger>
                  <SelectContent>
                    {(isEditMode ? areasData ?? [] : activeAreas).map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.areaName ?? (item as any).name ?? ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='rangeId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Range</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                  disabled={isEditMode || !activeRanges.length}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select Range' />
                  </SelectTrigger>
                  <SelectContent>
                    {(isEditMode ? activeRanges : filteredRanges).map(
                      (item, index) => {
                        const optionId = item.id ?? item.rangeId
                        if (optionId === undefined || optionId === null)
                          return null
                        return (
                          <SelectItem
                            key={`${optionId}-${index}`}
                            value={String(optionId)}
                          >
                            {item.rangeName ?? `Range ${optionId}`}
                          </SelectItem>
                        )
                      }
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className='text-xs text-gray-500'>
          If available, please enter old Territory Code.
        </p>

        <FormField
          control={form.control}
          name='displayOrder'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Order</FormLabel>
              <FormControl>
                <Input
                  placeholder='Display Order'
                  type='number'
                  min={0}
                  {...field}
                  value={
                    field.value === undefined
                      ? ''
                      : (field.value as number | string)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='territoryCode'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Territory Code</FormLabel>
              <FormControl>
                <Input placeholder='Territory Code' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='territoryName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Territory Name</FormLabel>
              <FormControl>
                <Input placeholder='Territory Name' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='isActive'
          render={({ field }) => (
            <FormItem className='mt-1 flex flex-row items-center gap-2'>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(value) => field.onChange(!!value)}
                />
              </FormControl>
              <FormLabel className='m-0'>IsActive</FormLabel>
            </FormItem>
          )}
        />

        <div className='mt-2 flex flex-col gap-2 sm:flex-row'>
          <Button
            type='button'
            variant='outline'
            className='w-full sm:flex-1'
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancel
          </Button>

          <Button
            type='submit'
            variant={submitVariant}
            className='w-full sm:flex-1'
            disabled={isSubmitting}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
