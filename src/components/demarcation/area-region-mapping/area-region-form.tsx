import { z } from 'zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import type { SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ApiResponse,
  type AreaDTO,
  type AreaRegionDTO,
  type ChannelDTO,
  type CreateAreaRegionMappingRequest,
  type RegionDTO,
  type SubChannelDTO,
  type UpdateAreaRegionRequest,
  type Id,
} from '@/services/userDemarcationApi'
import {
  createNewAreaRegionMapping,
  getAllArea,
  getAllRegion,
  getAllSubChannel,
  updateAreaRegion,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'

const areaRegionFormSchema = z.object({
  areaId: z.string().min(1, 'Please select an area'),
  regionIds: z.array(z.string().min(1)).min(1, 'Select at least one region'),
  isActive: z.boolean(),
  channelId: z.string().optional(),
  subChannelIds: z.array(z.string().min(1)).optional(),
})

export type AreaRegionFormValues = z.output<typeof areaRegionFormSchema>

type AreaRegionFormProps = {
  mode: 'create' | 'edit'
  mappingId?: Id
  initialValues?: Partial<AreaRegionFormValues>
  onSubmit?: (values: AreaRegionFormValues) => void | Promise<void>
  onCancel?: () => void
  channels: ChannelDTO[]
}

export function AreaRegionForm(props: AreaRegionFormProps) {
  const { mode, mappingId, initialValues, onSubmit, onCancel, channels } = props
  const queryClient = useQueryClient()
  const user = useAppSelector((s) => s.auth.user)
  const isCreateMode = mode === 'create'

  const { data: areasData } = useQuery({
    queryKey: ['areas', 'options'],
    queryFn: async () => {
      const res = (await getAllArea()) as ApiResponse<AreaDTO[]>
      return res.payload
    },
    initialData: () => {
      const existing = queryClient.getQueryData<ApiResponse<AreaDTO[]>>([
        'areas',
      ])
      return existing?.payload
    },
  })

  const { data: regionsData } = useQuery({
    queryKey: ['regions', 'options'],
    queryFn: async () => {
      const res = (await getAllRegion()) as ApiResponse<RegionDTO[]>
      return res.payload
    },
    initialData: () => {
      const existing = queryClient.getQueryData<ApiResponse<RegionDTO[]>>([
        'regions',
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
    initialData: () => {
      const existing =
        queryClient.getQueryData<ApiResponse<SubChannelDTO[]>>([
          'sub-channels',
        ])
      return existing?.payload
    },
  })

  const defaultValues: AreaRegionFormValues = {
    areaId: initialValues?.areaId ?? '',
    regionIds: initialValues?.regionIds ?? [],
    isActive: initialValues?.isActive ?? true,
    channelId: initialValues?.channelId ?? '',
    subChannelIds: initialValues?.subChannelIds ?? [],
  }

  const form = useForm<AreaRegionFormValues, any, AreaRegionFormValues>({
    resolver: zodResolver(areaRegionFormSchema),
    defaultValues,
  })

  const selectedChannelId = form.watch('channelId') ?? ''
  const filteredSubChannels = useMemo(() => {
    if (!isCreateMode) return []
    if (!subChannelsData) return []
    if (!selectedChannelId) return subChannelsData
    return subChannelsData.filter(
      (subChannel) => String(subChannel.channelId ?? '') === selectedChannelId
    )
  }, [isCreateMode, selectedChannelId, subChannelsData])

  const selectedSubChannelIds = form.watch('subChannelIds') ?? []
  const filteredRegions = useMemo(() => {
    if (!regionsData) return []
    if (!isCreateMode || !selectedSubChannelIds.length) return regionsData
    const subChannelIdSet = new Set(selectedSubChannelIds)
    return regionsData.filter((region) => {
      const regionSubChannelId = String(region.subChannelId ?? '')
      return subChannelIdSet.has(regionSubChannelId)
    })
  }, [regionsData, selectedSubChannelIds, isCreateMode])

  const createMutation = useMutation({
    mutationFn: async (values: AreaRegionFormValues) => {
      const uniqueRegionIds = Array.from(new Set(values.regionIds))
      const payload: CreateAreaRegionMappingRequest = {
        areaRegionsDTOList: uniqueRegionIds.map((regionId) => ({
          userId: user?.userId ?? 0,
          areaId: Number(values.areaId),
          regionId: Number(regionId),
          isActive: values.isActive,
        })),
      }
      return createNewAreaRegionMapping(payload)
    },
    onSuccess: async (_data, variables) => {
      toast.success('Area region mapping created successfully')
      await queryClient.invalidateQueries({ queryKey: ['area-region-mappings'] })
      await onSubmit?.(variables)
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create area region mapping'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (input: {
      id: Id
      values: AreaRegionFormValues
    }) => {
      const { id, values } = input
      const payload: UpdateAreaRegionRequest = {
        id,
        userId: user?.userId ?? 0,
        areaId: Number(values.areaId),
        regionId: Number(values.regionIds[0]),
        isActive: values.isActive,
      }
      return updateAreaRegion(payload)
    },
    onSuccess: async (data, { values }) => {
      toast.success('Area region mapping updated successfully')
      queryClient.setQueryData<ApiResponse<AreaRegionDTO[]>>(
        ['area-region-mappings'],
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
        error instanceof Error
          ? error.message
          : 'Failed to update area region mapping'
      toast.error(message)
    },
  })

  const handleSubmit: SubmitHandler<AreaRegionFormValues> = async (values) => {
    if (isCreateMode) {
      if (!values.channelId) {
        form.setError('channelId', {
          type: 'manual',
          message: 'Please select a channel',
        })
        return
      }
      if (!values.subChannelIds || values.subChannelIds.length === 0) {
        form.setError('subChannelIds', {
          type: 'manual',
          message: 'Select at least one sub channel',
        })
        return
      }
    } else if (values.regionIds.length !== 1) {
      form.setError('regionIds', {
        type: 'manual',
        message: 'Select exactly one region',
      })
      return
    }

    if (mode === 'create') {
      await createMutation.mutateAsync(values)
    } else if (mode === 'edit' && mappingId != null) {
      await updateMutation.mutateAsync({ id: mappingId, values })
    } else {
      await onSubmit?.(values)
    }
  }

  const isSubmitting =
    form.formState.isSubmitting ||
    createMutation.isPending ||
    updateMutation.isPending
  const submitVariant = 'default'
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className='flex flex-col gap-3'
      >
        <FormField
          control={form.control}
          name='areaId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isCreateMode ? 'Step 01' : 'Area'}</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select Area' />
                  </SelectTrigger>
                  <SelectContent>
                    {areasData?.map((area) => (
                      <SelectItem key={area.id} value={String(area.id)}>
                        {area.areaName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isCreateMode ? (
          <>
            <FormField
              control={form.control}
              name='channelId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Step 02</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        form.setValue('subChannelIds', [])
                        form.setValue('regionIds', [])
                      }}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select Channel' />
                      </SelectTrigger>
                      <SelectContent>
                        {channels?.map((channel) => (
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

            <FormField
              control={form.control}
              name='subChannelIds'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Multiple Sub Channel</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={filteredSubChannels.map((subChannel) => ({
                        label: subChannel.subChannelName,
                        value: String(subChannel.id),
                      }))}
                      value={field.value ?? []}
                      onValueChange={(value) => {
                        field.onChange(value)
                        form.setValue('regionIds', [])
                      }}
                      placeholder='Select Sub Channel'
                      disabled={!filteredSubChannels.length}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='regionIds'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Multiple Region</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={filteredRegions.map((region) => ({
                        label: region.regionName ?? region.name ?? '',
                        value: String(region.id),
                      }))}
                      value={field.value ?? []}
                      onValueChange={(value) => field.onChange(value)}
                      placeholder='Select Region'
                      disabled={!filteredRegions.length}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : (
          <FormField
            control={form.control}
            name='regionIds'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Region</FormLabel>
                <FormControl>
                  <Select
                    value={field.value?.[0] ?? ''}
                    onValueChange={(value) => field.onChange([value])}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select Region' />
                    </SelectTrigger>
                    <SelectContent>
                      {regionsData?.map((region) => (
                        <SelectItem key={region.id} value={String(region.id)}>
                          {region.regionName ?? region.name ?? ''}
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

        <div className='mt-4 flex flex-col gap-2 sm:flex-row'>
          <Button
            type='button'
            variant='outline'
            className='w-full sm:flex-1'
            disabled={isSubmitting}
            onClick={() => onCancel?.()}
          >
            {isCreateMode ? 'Cancel' : 'Discard'}
          </Button>
          <Button
            type='submit'
            variant={submitVariant}
            className='w-full sm:flex-1'
            disabled={isSubmitting}
          >
            {isCreateMode ? 'Create' : 'Update Area'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
