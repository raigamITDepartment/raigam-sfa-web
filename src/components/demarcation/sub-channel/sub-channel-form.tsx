import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ApiResponse,
  type ChannelDTO,
  type CreateSubChannelRequest,
  type UpdateSubChannelRequest,
  type Id,
} from '@/services/userDemarcationApi'
import {
  createSubChannel,
  getAllChannel,
  updateSubChannel,
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

const subChannelFormSchema = z.object({
  channelId: z.string().min(1, 'Please select a channel'),
  subChannelCode: z.string().min(1, 'Please enter sub-channel code'),
  subChannelName: z.string().min(1, 'Please enter sub-channel name'),
  shortName: z.string().min(1, 'Please enter sub-channel short name'),
  isActive: z.boolean().default(true),
})

type SubChannelFormInput = z.input<typeof subChannelFormSchema>
export type SubChannelFormValues = z.output<typeof subChannelFormSchema>

type SubChannelFormProps = {
  mode: 'create' | 'edit'
  subChannelId?: Id
  initialValues?: Partial<SubChannelFormValues>
  onSubmit?: (values: SubChannelFormValues) => void | Promise<void>
  onCancel?: () => void
}

export function SubChannelForm(props: SubChannelFormProps) {
  const { mode, subChannelId, initialValues, onSubmit, onCancel } = props
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

  const form = useForm<SubChannelFormInput, any, SubChannelFormValues>({
    resolver: zodResolver(subChannelFormSchema),
    defaultValues: {
      channelId: '',
      subChannelCode: '',
      subChannelName: '',
      shortName: '',
      isActive: true,
      ...initialValues,
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: SubChannelFormValues) => {
      const payload: CreateSubChannelRequest = {
        channelId: Number(values.channelId),
        userId: user?.userId ?? 0,
        subChannelName: values.subChannelName,
        shortName: values.shortName,
        subChannelCode: values.subChannelCode,
        isActive: values.isActive,
      }
      return createSubChannel(payload)
    },
    onSuccess: async (data, variables) => {
      toast.success('Sub channel created successfully')
      queryClient.setQueryData<ApiResponse<any>>(['sub-channels'], (old) => {
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
        error instanceof Error
          ? error.message
          : 'Failed to create sub channel'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (input: { id: Id; values: SubChannelFormValues }) => {
      const { id, values } = input
      const payload: UpdateSubChannelRequest = {
        id,
        channelId: Number(values.channelId),
        userId: user?.userId ?? 0,
        subChannelName: values.subChannelName,
        shortName: values.shortName,
        subChannelCode: values.subChannelCode,
        isActive: values.isActive,
      }
      return updateSubChannel(payload)
    },
    onSuccess: async (data, { values }) => {
      toast.success('Sub channel updated successfully')
      queryClient.setQueryData<ApiResponse<any>>(['sub-channels'], (old) => {
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
        error instanceof Error
          ? error.message
          : 'Failed to update sub channel'
      toast.error(message)
    },
  })

  const handleSubmit = async (values: SubChannelFormValues) => {
    if (mode === 'create') {
      await createMutation.mutateAsync(values)
    } else if (mode === 'edit' && subChannelId != null) {
      await updateMutation.mutateAsync({ id: subChannelId, values })
    } else {
      await onSubmit?.(values)
    }
  }

  const isSubmitting =
    form.formState.isSubmitting ||
    createMutation.isPending ||
    updateMutation.isPending
  const submitLabel = mode === 'create' ? 'Create' : 'Update'

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
          name='subChannelCode'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sub Channel Code</FormLabel>
              <FormControl>
                <Input placeholder='Sub Channel Code' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='subChannelName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sub Channel Name</FormLabel>
              <FormControl>
                <Input placeholder='Sub Channel Name' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='shortName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sub Channel Short Name</FormLabel>
              <FormControl>
                <Input placeholder='Sub Channel Short Name' {...field} />
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
