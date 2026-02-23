import { useEffect, useMemo, useRef } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAgencyDistributorMapping,
  getAllAgency,
  getAllDistributorsByRangeId,
  getAllRange,
  updateAgencyDistributorMapping,
  type AgencyDTO,
  type ApiResponse,
  type CreateAgencyDistributorMappingRequest,
  type UpdateAgencyDistributorMappingRequest,
  type DistributorDTO,
  type RangeDTO,
} from '@/services/userDemarcationApi'
import { useAppSelector } from '@/store/hooks'
import { X } from 'lucide-react'
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
import { MultiSelect } from '@/components/ui/multi-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const createAgencyMappingFormSchema = z.object({
  rangeId: z.string().min(1, 'Please select a range'),
  distributorId: z.string().min(1, 'Please select a distributor'),
  agencyIds: z.array(z.string().min(1)).min(1, 'Select at least one agency'),
  isActive: z.boolean().default(true),
})

export type CreateAgencyMappingFormValues = z.output<
  typeof createAgencyMappingFormSchema
>

type CreateAgencyMappingFormProps = {
  initialValues?: Partial<CreateAgencyMappingFormValues>
  onSubmit?: (values: CreateAgencyMappingFormValues) => void | Promise<void>
  onCancel?: () => void
  mode?: 'create' | 'edit'
  hideRange?: boolean
  mappingId?: number
  mappingUserId?: number | null
  mappingAgencyCode?: number | string | null
}

export function CreateAgencyMappingForm({
  initialValues,
  onSubmit,
  onCancel,
  mode = 'create',
  hideRange = false,
  mappingId,
  mappingUserId,
  mappingAgencyCode,
}: CreateAgencyMappingFormProps) {
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)
  const previousRangeRef = useRef<string>('')

  const { data: rangesData } = useQuery({
    queryKey: ['ranges', 'options'],
    queryFn: async () => {
      const res = (await getAllRange()) as ApiResponse<RangeDTO[]>
      return res.payload
    },
    initialData: () =>
      queryClient.getQueryData<ApiResponse<RangeDTO[]>>(['ranges'])?.payload,
  })

  const { data: agenciesData } = useQuery({
    queryKey: ['agencies', 'options'],
    queryFn: async () => {
      const res = (await getAllAgency()) as ApiResponse<AgencyDTO[]>
      return res.payload
    },
    initialData: () =>
      queryClient.getQueryData<ApiResponse<AgencyDTO[]>>(['agencies'])?.payload,
  })

  const form = useForm<
    z.input<typeof createAgencyMappingFormSchema>,
    any,
    CreateAgencyMappingFormValues
  >({
    resolver: zodResolver(createAgencyMappingFormSchema),
    defaultValues: {
      rangeId: '',
      distributorId: '',
      agencyIds: [],
      isActive: true,
      ...initialValues,
    },
  })

  useEffect(() => {
    form.reset({
      rangeId: '',
      distributorId: '',
      agencyIds: [],
      isActive: true,
      ...initialValues,
    })
  }, [initialValues, form])

  const selectedRangeId = form.watch('rangeId')

  const { data: distributorsData, isFetching: isFetchingDistributors } =
    useQuery({
      queryKey: ['distributors', 'by-range', selectedRangeId],
      queryFn: async () => {
        const res = (await getAllDistributorsByRangeId(
          Number(selectedRangeId)
        )) as ApiResponse<DistributorDTO[]>
        return res.payload
      },
      enabled: Boolean(selectedRangeId),
    })

  useEffect(() => {
    if (!selectedRangeId) {
      previousRangeRef.current = ''
      return
    }
    if (previousRangeRef.current && previousRangeRef.current !== selectedRangeId) {
      form.setValue('distributorId', '')
      form.setValue('agencyIds', [])
    }
    previousRangeRef.current = selectedRangeId
  }, [selectedRangeId, form])

  const activeRanges = useMemo(
    () =>
      rangesData?.filter((range) => {
        const active =
          (range as { isActive?: boolean }).isActive ??
          (range as { active?: boolean }).active ??
          true
        return active
      }) ?? [],
    [rangesData]
  )

  const activeAgencies = useMemo(
    () => agenciesData ?? [],
    [agenciesData]
  )

  const agencyOptions = useMemo(() => {
    return [...activeAgencies]
      .map((agency) => {
        const labelBase =
          agency.agencyName?.trim() ||
          (agency.agencyCode
            ? `Agency ${agency.agencyCode}`
            : `Agency ${agency.id}`)
        const isActive =
          (agency.isActive as boolean | undefined) ??
          (agency.active as boolean | undefined) ??
          true
        return {
          value: String(agency.id),
          label: isActive ? labelBase : `${labelBase} (Inactive)`,
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [activeAgencies])

  const agencyOptionMap = useMemo(() => {
    return new Map(agencyOptions.map((option) => [option.value, option.label]))
  }, [agencyOptions])

  const mutation = useMutation({
    mutationFn: async (values: CreateAgencyMappingFormValues) => {
      if (mode === 'edit') {
        if (mappingId == null) {
          throw new Error('Missing mapping id')
        }
        const agencyId = values.agencyIds[0]
        const payload: UpdateAgencyDistributorMappingRequest = {
          id: mappingId,
          userId: user?.userId ?? mappingUserId ?? 0,
          agencyId: Number(agencyId),
          distributorId: Number(values.distributorId),
          agencyCode: mappingAgencyCode ?? undefined,
          isActive: values.isActive,
        }
        return updateAgencyDistributorMapping(payload)
      }

      const payload: CreateAgencyDistributorMappingRequest = {
        agencyDistributorDTOList: values.agencyIds.map((agencyId) => ({
          userId: user?.userId ?? 0,
          agencyId: Number(agencyId),
          distributorId: Number(values.distributorId),
          isActive: values.isActive,
        })),
      }
      return createAgencyDistributorMapping(payload)
    },
    onSuccess: async (_data, values) => {
      toast.success(
        mode === 'edit'
          ? 'Agency mapping updated successfully'
          : 'Agency mapping created successfully'
      )
      await queryClient.invalidateQueries({
        queryKey: ['agency-distributor-mappings'],
      })
      await onSubmit?.(values)
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : mode === 'edit'
            ? 'Failed to update agency mapping'
            : 'Failed to create agency mapping'
      toast.error(message)
    },
  })

  const handleSubmit = async (values: CreateAgencyMappingFormValues) => {
    await mutation.mutateAsync(values)
  }

  const isSubmitting = form.formState.isSubmitting || mutation.isPending
  const submitLabel = mode === 'edit' ? 'Update' : 'Create'
  const submittingLabel = mode === 'edit' ? 'Updating...' : 'Creating...'
  const submitVariant = 'default'

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className='flex flex-col gap-3'
      >
        {!hideRange ? (
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
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select Range' />
                    </SelectTrigger>
                    <SelectContent>
                      {activeRanges.length ? (
                        activeRanges.map((range, index) => {
                          const id = range.id ?? range.rangeId
                          if (id == null) return null
                          return (
                            <SelectItem key={`${id}-${index}`} value={String(id)}>
                              {range.rangeName ?? `Range ${id}`}
                            </SelectItem>
                          )
                        })
                      ) : (
                        <SelectItem value='no-range' disabled>
                          No ranges found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <FormField
          control={form.control}
          name='distributorId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Distributor</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                  disabled={!selectedRangeId || isFetchingDistributors}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select Distributor' />
                  </SelectTrigger>
                  <SelectContent>
                    {!selectedRangeId ? (
                      <SelectItem value='range-first' disabled>
                        Select range first
                      </SelectItem>
                    ) : isFetchingDistributors ? (
                      <SelectItem value='loading' disabled>
                        Loading distributors...
                      </SelectItem>
                    ) : distributorsData?.length ? (
                      distributorsData.map((distributor) => (
                        <SelectItem
                          key={distributor.id}
                          value={String(distributor.id)}
                        >
                          {distributor.distributorName ??
                            `Distributor ${distributor.id}`}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value='no-distributors' disabled>
                        No distributors found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='agencyIds'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Multi Select Agencies</FormLabel>
              <FormControl>
                <MultiSelect
                  options={agencyOptions}
                  value={field.value ?? []}
                  onValueChange={(value) => field.onChange(value)}
                  placeholder='Select...'
                  disabled={!agencyOptions.length}
                  className='w-full'
                />
              </FormControl>
              {field.value?.length ? (
                <div className='mt-2 flex flex-wrap gap-2'>
                  {field.value.map((id) => (
                    <div
                      key={id}
                      className='flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs'
                    >
                      <span className='max-w-[200px] truncate'>
                        {agencyOptionMap.get(id) ?? `Agency ${id}`}
                      </span>
                      <button
                        type='button'
                        className='text-muted-foreground hover:text-foreground'
                        onClick={() =>
                          field.onChange(
                            field.value.filter((value) => value !== id)
                          )
                        }
                        aria-label={`Remove ${agencyOptionMap.get(id) ?? id}`}
                      >
                        <X className='size-3.5' />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
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

        {onCancel ? (
          <div className='mt-2 flex gap-2'>
            <Button
              type='button'
              variant='outline'
              className='w-full flex-1'
              disabled={isSubmitting}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              variant={submitVariant}
              className='w-full flex-1'
              disabled={isSubmitting}
            >
              {isSubmitting ? submittingLabel : submitLabel}
            </Button>
          </div>
        ) : (
          <Button
            type='submit'
            variant={submitVariant}
            className='mt-2 w-full'
            disabled={isSubmitting}
          >
            {isSubmitting ? submittingLabel : submitLabel}
          </Button>
        )}
      </form>
    </Form>
  )
}
