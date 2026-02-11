import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ApiResponse,
  type ChannelDTO,
  type SubChannelDTO,
  type CreateRegionRequest,
  type UpdateRegionRequest,
  type Id,
} from '@/services/userDemarcationApi'
import {
  createRegion,
  getAllChannel,
  getAllSubChannel,
  updateRegion,
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

const regionFormSchema = z.object({
  channelId: z.string().min(1, 'Please select a channel'),
  subChannelId: z.string().optional(),
  regionCode: z.string().min(1, 'Please enter region code'),
  regionName: z.string().min(1, 'Please enter region name'),
  isActive: z.boolean().default(true),
})

type RegionFormInput = z.input<typeof regionFormSchema>
export type RegionFormValues = z.output<typeof regionFormSchema>

type RegionFormProps = {
  mode: 'create' | 'edit'
  regionId?: Id
  initialValues?: Partial<RegionFormValues>
  onSubmit?: (values: RegionFormValues) => void | Promise<void>
  onCancel?: () => void
}

export function RegionForm(props: RegionFormProps) {
  const { mode, regionId, initialValues, onSubmit, onCancel } = props
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

  const form = useForm<RegionFormInput, any, RegionFormValues>({
    resolver: zodResolver(regionFormSchema),
    defaultValues: {
      channelId: '',
      subChannelId: '',
      regionCode: '',
      regionName: '',
      isActive: true,
      ...initialValues,
    },
  })

  const { data: subChannelsData } = useQuery({
    queryKey: ['sub-channels', 'options'],
    queryFn: async () => {
      const res = (await getAllSubChannel()) as ApiResponse<SubChannelDTO[]>
      return res.payload
    },
  })

  const channelValue = form.watch('channelId')
  const filteredSubChannels = useMemo(() => {
    if (!subChannelsData) return []
    if (!channelValue) return subChannelsData
    return subChannelsData.filter((sc) => String(sc.channelId ?? '') === channelValue)
  }, [subChannelsData, channelValue])

  useEffect(() => {
    const currentSub = form.getValues('subChannelId')
    if (!currentSub) return
    const stillValid = filteredSubChannels.some(
      (sc) => String(sc.id) === currentSub
    )
    if (!stillValid) form.setValue('subChannelId', '')
  }, [filteredSubChannels, form])

  const createMutation = useMutation({
    mutationFn: async (values: RegionFormValues) => {
      const payload: CreateRegionRequest = {
        userId: user?.userId ?? 0,
        channelId: Number(values.channelId),
        subChannelId: values.subChannelId ? Number(values.subChannelId) : undefined,
        regionName: values.regionName,
        regionCode: values.regionCode,
        isActive: values.isActive,
      }
      return createRegion(payload)
    },
    onSuccess: async (data, variables) => {
      toast.success('Region created successfully')
      queryClient.setQueryData<ApiResponse<any>>(['regions'], (old) => {
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
      })
      await onSubmit?.(variables)
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to create region'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (input: { id: Id; values: RegionFormValues }) => {
      const { id, values } = input
      const payload: UpdateRegionRequest = {
        id,
        userId: user?.userId ?? 0,
        channelId: Number(values.channelId),
        subChannelId: values.subChannelId ? Number(values.subChannelId) : undefined,
        regionName: values.regionName,
        regionCode: values.regionCode,
        isActive: values.isActive,
      }
      return updateRegion(payload)
    },
    onSuccess: async (data, { values }) => {
      toast.success('Region updated successfully')
      queryClient.setQueryData<ApiResponse<any>>(['regions'], (old) => {
        if (!old || !Array.isArray(old.payload)) return old
        return {
          ...old,
          payload: old.payload.map((item: any) =>
            String(item.id) === String(data.payload.id) ? data.payload : item
          ),
        }
      })
      await onSubmit?.(values)
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to update region'
      toast.error(message)
    },
  })

  const handleSubmit = async (values: RegionFormValues) => {
    if (mode === 'create') {
      await createMutation.mutateAsync(values)
    } else if (mode === 'edit' && regionId != null) {
      await updateMutation.mutateAsync({ id: regionId, values })
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
        <FormField
          control={form.control}
          name='channelId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Channel</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select Channel' />
                  </SelectTrigger>
                  <SelectContent>
                    {channelsData
                      ?.filter((channel) => {
                        const active =
                          (channel.isActive as boolean | undefined) ??
                          (channel.active as boolean | undefined) ??
                          true
                        return active
                      })
                      .map((channel) => (
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
          name='subChannelId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sub Channel</FormLabel>
              <FormControl>
                <Select
                  value={field.value ?? ''}
                  onValueChange={(value) => field.onChange(value)}
                  disabled={!filteredSubChannels.length}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select Sub Channel' />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubChannels.map((subChannel) => (
                      <SelectItem key={subChannel.id} value={String(subChannel.id)}>
                        {subChannel.subChannelName}
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
          name='regionCode'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Region Code</FormLabel>
              <FormControl>
                <Input placeholder='Region Code' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='regionName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Region Name</FormLabel>
              <FormControl>
                <Input placeholder='Region Name' {...field} />
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
