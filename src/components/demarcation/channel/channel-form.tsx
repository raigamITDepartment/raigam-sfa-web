import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ApiResponse,
  CountryDTO,
  CreateChannelRequest,
  UpdateChannelRequest,
  Id,
} from '@/services/userDemarcationApi'
import {
  createChannel,
  getAllCountrys,
  updateChannel,
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

const channelFormSchema = z.object({
  countryId: z.string().min(1, 'Please select a country'),
  channelCode: z.string().min(1, 'Please enter channel code'),
  channelName: z.string().min(1, 'Please enter channel name'),
  isActive: z.boolean().default(true),
})

type ChannelFormInput = z.input<typeof channelFormSchema>
export type ChannelFormValues = z.output<typeof channelFormSchema>

type ChannelFormProps = {
  mode: 'create' | 'edit'
  channelId?: Id
  initialValues?: Partial<ChannelFormValues>
  onSubmit?: (values: ChannelFormValues) => void | Promise<void>
  onCancel?: () => void
}

export function ChannelForm(props: ChannelFormProps) {
  const { mode, initialValues, onSubmit, onCancel, channelId } = props
  const queryClient = useQueryClient()
  const user = useAppSelector((s) => s.auth.user)

  const { data: countriesData } = useQuery({
    queryKey: ['user-demarcation', 'countries'],
    queryFn: async () => {
      const res = (await getAllCountrys()) as ApiResponse<CountryDTO[]>
      return res.payload
    },
  })

  const form = useForm<ChannelFormInput, any, ChannelFormValues>({
    resolver: zodResolver(channelFormSchema),
    defaultValues: {
      countryId: '',
      channelCode: '',
      channelName: '',
      isActive: true,
      ...initialValues,
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: ChannelFormValues) => {
      const payload: CreateChannelRequest = {
        userId: user?.userId ?? 0,
        countryId: Number(values.countryId),
        channelName: values.channelName,
        channelCode: values.channelCode,
        isActive: values.isActive,
      }
      return createChannel(payload)
    },
    onSuccess: async (_data, variables) => {
      toast.success('Channel created successfully')
      await queryClient.invalidateQueries({ queryKey: ['channels'] })
      await onSubmit?.(variables)
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to create channel'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (input: { id: Id; values: ChannelFormValues }) => {
      const { id, values } = input
      const payload: UpdateChannelRequest = {
        id,
        userId: user?.userId ?? 0,
        countryId: Number(values.countryId),
        channelName: values.channelName,
        channelCode: values.channelCode,
        isActive: values.isActive,
      }
      return updateChannel(payload)
    },
    onSuccess: async (_data, { values }) => {
      toast.success('Channel updated successfully')
      await queryClient.invalidateQueries({ queryKey: ['channels'] })
      await onSubmit?.(values)
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to update channel'
      toast.error(message)
    },
  })

  const handleSubmit = async (values: ChannelFormValues) => {
    if (mode === 'create') {
      await createMutation.mutateAsync(values)
    } else if (mode === 'edit' && channelId != null) {
      await updateMutation.mutateAsync({ id: channelId, values })
    } else {
      await onSubmit?.(values)
    }
    // do not reset here; parent decides whether to close/reset
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
          name='countryId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select Country' />
                  </SelectTrigger>
                  <SelectContent>
                    {countriesData
                      ?.filter((c) => c.active)
                      .map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.countryName}
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
          name='channelCode'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Channel Code</FormLabel>
              <FormControl>
                <Input placeholder='Channel Code' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='channelName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Channel Name</FormLabel>
              <FormControl>
                <Input placeholder='Channel Name' {...field} />
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
                  onCheckedChange={(v) => field.onChange(!!v)}
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
