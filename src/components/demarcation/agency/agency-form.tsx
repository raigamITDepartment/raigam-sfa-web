import { useEffect, useRef } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type AgencyDTO,
  type ApiResponse,
  type ChannelDTO,
  type CreateAgencyRequest,
  type Id,
  type TerritoryDTO,
  type UpdateAgencyRequest,
  createAgency,
  getAllChannel,
  getAllSubChannelsByChannelId,
  getAllTerritories,
  updateAgency,
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

const agencyFormSchema = z.object({
  channelId: z.string().min(1, 'Please select a channel'),
  subChannelId: z.string().optional(),
  territoryId: z.string().min(1, 'Please select a territory'),
  agencyName: z.string().min(1, 'Please enter agency name'),
  agencyCode: z.string().optional(),
  oldAgencyCode: z.string().optional(),
  isActive: z.boolean().default(true),
})

type AgencyFormInput = z.input<typeof agencyFormSchema>
export type AgencyFormValues = z.output<typeof agencyFormSchema>

type AgencyFormProps = {
  mode: 'create' | 'edit'
  agencyId?: Id
  initialValues?: Partial<AgencyFormValues>
  onSubmit?: (values: AgencyFormValues) => void | Promise<void>
  onCancel?: () => void
}

export function AgencyForm(props: AgencyFormProps) {
  const { mode, initialValues, onSubmit, onCancel, agencyId } = props
  const queryClient = useQueryClient()
  const user = useAppSelector((s) => s.auth.user)

  const { data: channelsData } = useQuery({
    queryKey: ['user-demarcation', 'channels'],
    queryFn: async () => {
      const res = (await getAllChannel()) as ApiResponse<ChannelDTO[]>
      return res.payload
    },
  })

  const { data: territoriesData } = useQuery({
    queryKey: ['user-demarcation', 'territories'],
    queryFn: async () => {
      const res = await getAllTerritories()
      return (res as ApiResponse<TerritoryDTO[]>).payload
    },
  })

  const form = useForm<AgencyFormInput, any, AgencyFormValues>({
    resolver: zodResolver(agencyFormSchema),
    defaultValues: {
      channelId: '',
      subChannelId: '',
      territoryId: '',
      agencyName: '',
      agencyCode: mode === 'create' ? '0' : '',
      oldAgencyCode: '',
      isActive: true,
      ...initialValues,
    },
    mode: 'onBlur',
  })

  useEffect(() => {
    form.reset({
      channelId: '',
      subChannelId: '',
      territoryId: '',
      agencyName: '',
      agencyCode: mode === 'create' ? '0' : '',
      oldAgencyCode: '',
      isActive: true,
      ...initialValues,
    })
  }, [initialValues, form, mode])

  const channelIdValue = form.watch('channelId')
  const prevChannelIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!channelIdValue) {
      if (form.getValues('subChannelId')) {
        form.setValue('subChannelId', '')
      }
      prevChannelIdRef.current = ''
      return
    }

    if (
      prevChannelIdRef.current &&
      prevChannelIdRef.current !== channelIdValue
    ) {
      form.setValue('subChannelId', '')
    }

    prevChannelIdRef.current = channelIdValue
  }, [channelIdValue, form])

  const { data: subChannelsData } = useQuery({
    queryKey: ['user-demarcation', 'sub-channels', channelIdValue],
    queryFn: async () => {
      const res = await getAllSubChannelsByChannelId(Number(channelIdValue))
      return res.payload
    },
    enabled: Boolean(channelIdValue),
  })

  const createMutation = useMutation({
    mutationFn: async (values: AgencyFormValues) => {
      const payload: CreateAgencyRequest = {
        userId: user?.userId ?? 0,
        channelId: Number(values.channelId),
        subChannelId:
          values.subChannelId && values.subChannelId.trim()
            ? Number(values.subChannelId)
            : undefined,
        territoryId: Number(values.territoryId),
        agencyName: values.agencyName,
        agencyCode:
          values.agencyCode && values.agencyCode.trim()
            ? Number(values.agencyCode)
            : 0,
        oldAgencyCode: values.oldAgencyCode?.trim() || undefined,
        isActive: values.isActive,
      }
      return createAgency(payload)
    },
    onSuccess: async (data, variables) => {
      toast.success('Agency created successfully')
      const resolvedChannel = channelsData?.find(
        (channel) => String(channel.id) === String(variables.channelId)
      )
      const resolvedTerritory = territoriesData?.find(
        (territory) => String(territory.id) === String(variables.territoryId)
      )
      const resolvedChannelName =
        (resolvedChannel?.channelName as string | undefined) ?? ''
      const resolvedTerritoryName =
        (resolvedTerritory?.territoryName as string | undefined) ??
        (resolvedTerritory?.name as string | undefined) ??
        ''
      const resolvedRange =
        (resolvedTerritory?.rangeName as string | undefined) ??
        (resolvedTerritory?.range as string | undefined) ??
        ''
      const createdPayload = data.payload
        ? {
            ...data.payload,
            channelId:
              (data.payload as AgencyDTO).channelId ??
              Number(variables.channelId),
            territoryId:
              (data.payload as AgencyDTO).territoryId ??
              Number(variables.territoryId),
            channelName:
              (data.payload as AgencyDTO).channelName ?? resolvedChannelName,
            territoryName:
              (data.payload as AgencyDTO).territoryName ??
              resolvedTerritoryName,
            range: (data.payload as AgencyDTO).range ?? resolvedRange,
          }
        : data.payload
      queryClient.setQueryData<ApiResponse<AgencyDTO[]>>(
        ['agencies'],
        (old) => {
          if (!old) {
            return {
              ...data,
              payload: createdPayload ? [createdPayload] : old?.payload ?? [],
            }
          }
          if (!Array.isArray(old.payload)) return old
          return {
            ...old,
            payload: createdPayload
              ? [createdPayload, ...old.payload]
              : old.payload,
          }
        }
      )
      await onSubmit?.(variables)
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to create agency'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (input: { id: Id; values: AgencyFormValues }) => {
      const { id, values } = input
      const payload: UpdateAgencyRequest = {
        id,
        userId: user?.userId ?? 0,
        channelId: Number(values.channelId),
        subChannelId:
          values.subChannelId && values.subChannelId.trim()
            ? Number(values.subChannelId)
            : undefined,
        territoryId: Number(values.territoryId),
        agencyName: values.agencyName,
        agencyCode:
          values.agencyCode && values.agencyCode.trim()
            ? Number(values.agencyCode)
            : 0,
        oldAgencyCode: values.oldAgencyCode?.trim() || undefined,
        isActive: values.isActive,
      }
      return updateAgency(payload)
    },
    onSuccess: async (data, { values }) => {
      toast.success('Agency updated successfully')
      queryClient.setQueryData<ApiResponse<AgencyDTO[]>>(
        ['agencies'],
        (old) => {
          if (!old || !Array.isArray(old.payload)) return old
          const updatedPayload = old.payload.map((agency) =>
            String(agency.id) === String(data.payload.id)
              ? { ...agency, ...data.payload }
              : agency
          )
          return { ...old, payload: updatedPayload }
        }
      )
      await onSubmit?.(values)
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to update agency'
      toast.error(message)
    },
  })

  const handleSubmit = async (values: AgencyFormValues) => {
    if (mode === 'create') {
      await createMutation.mutateAsync(values)
    } else if (mode === 'edit' && agencyId != null) {
      await updateMutation.mutateAsync({ id: agencyId, values })
    } else {
      await onSubmit?.(values)
    }
  }

  const isSubmitting =
    form.formState.isSubmitting ||
    createMutation.isPending ||
    updateMutation.isPending
  const submitLabel = mode === 'create' ? 'Create' : 'Update Agency'
  const cancelLabel = 'Discard'

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
                    {channelsData?.map((channel) => (
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

        {mode === 'create' && (
          <>
            <FormField
              control={form.control}
              name='subChannelId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub Channel</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <SelectTrigger
                        className='w-full'
                        disabled={!channelIdValue}
                      >
                        <SelectValue placeholder='Select Sub Channel' />
                      </SelectTrigger>
                      <SelectContent>
                        {channelIdValue && subChannelsData?.length ? (
                          subChannelsData.map((subChannel) => (
                            <SelectItem
                              key={subChannel.id}
                              value={String(subChannel.id)}
                            >
                              {subChannel.subChannelName}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value='placeholder' disabled>
                            {channelIdValue
                              ? 'No sub channels found'
                              : 'Select channel first'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name='territoryId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Territory</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select Territory' />
                  </SelectTrigger>
                  <SelectContent>
                    {territoriesData?.map((territory) => (
                      <SelectItem
                        key={territory.id}
                        value={String(territory.id)}
                      >
                        {territory.territoryName ?? territory.name}
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
          name='agencyName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agency Name</FormLabel>
              <FormControl>
                <Input placeholder='Agency Name' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {mode === 'create' && (
          <FormField
            control={form.control}
            name='oldAgencyCode'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Old Agency Code</FormLabel>
                <FormControl>
                  <Input placeholder='Old Agency Code' {...field} />
                </FormControl>
                <p className='text-muted-foreground text-xs'>
                  If available, please enter old agency code
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name='isActive'
          render={({ field }) => (
            <FormItem className='mt-3 flex flex-row items-center gap-2'>
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
            type='submit'
            className='w-full sm:flex-1'
            disabled={isSubmitting}
          >
            {submitLabel}
          </Button>
          {mode === 'edit' && (
            <Button
              type='button'
              variant='outline'
              className='w-full sm:flex-1'
              disabled={isSubmitting}
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}
