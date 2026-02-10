import { useEffect, useMemo, useRef } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAgencyWarehouseMapping,
  getAllDistributorsByRangeId,
  getAllRange,
  updateAgencyWarehouseMapping,
  type ApiResponse,
  type AgencyWarehouseDTO,
  type CreateAgencyWarehouseRequest,
  type DistributorDTO,
  type RangeDTO,
  type UpdateAgencyWarehouseRequest,
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

type WarehouseMappingFormValues = {
  rangeId?: string
  distributorId: string
  warehouseName: string
  sapAgencyCode: string
  latitude: string
  longitude: string
  isActive: boolean
}

const warehouseMappingSchema = z.object({
  rangeId: z.string().optional(),
  distributorId: z.string().min(1, 'Please select a distributor'),
  warehouseName: z.string().min(1, 'Warehouse name is required'),
  sapAgencyCode: z.string().min(1, 'SAP Agency code is required'),
  latitude: z
    .string()
    .min(1, 'Latitude is required')
    .refine((value) => !Number.isNaN(Number(value)), 'Invalid latitude'),
  longitude: z
    .string()
    .min(1, 'Longitude is required')
    .refine((value) => !Number.isNaN(Number(value)), 'Invalid longitude'),
  isActive: z.boolean(),
})

export type CreateWarehouseMappingFormValues = WarehouseMappingFormValues

type CreateWarehouseMappingFormProps = {
  initialValues?: Partial<CreateWarehouseMappingFormValues>
  onSubmit?: (values: CreateWarehouseMappingFormValues) => void | Promise<void>
  onCancel?: () => void
  mode?: 'create' | 'edit'
  hideRange?: boolean
  mappingId?: number
  mappingUserId?: number | null
}

export function CreateWarehouseMappingForm({
  initialValues,
  onSubmit,
  onCancel,
  mode = 'create',
  hideRange = false,
  mappingId,
  mappingUserId,
}: CreateWarehouseMappingFormProps) {
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)
  const previousRangeRef = useRef<string>('')
  const requireRange = mode !== 'edit' && !hideRange

  const { data: rangesData } = useQuery({
    queryKey: ['ranges', 'options'],
    queryFn: async () => {
      const res = (await getAllRange()) as ApiResponse<RangeDTO[]>
      return res.payload
    },
    initialData: () =>
      queryClient.getQueryData<ApiResponse<RangeDTO[]>>(['ranges'])?.payload,
  })

  const form = useForm<WarehouseMappingFormValues>({
    resolver: zodResolver(warehouseMappingSchema),
    defaultValues: {
      rangeId: '',
      distributorId: '',
      warehouseName: '',
      sapAgencyCode: '',
      latitude: '0',
      longitude: '0',
      isActive: true,
      ...initialValues,
    },
  })

  useEffect(() => {
    form.reset({
      rangeId: '',
      distributorId: '',
      warehouseName: '',
      sapAgencyCode: '',
      latitude: '0',
      longitude: '0',
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

  const mutation = useMutation({
    mutationFn: async (values: CreateWarehouseMappingFormValues) => {
      if (mode === 'edit') {
        if (mappingId == null) {
          throw new Error('Missing mapping id')
        }
        const payload: UpdateAgencyWarehouseRequest = {
          id: mappingId,
          userId: user?.userId ?? mappingUserId ?? 0,
          distributorId: Number(values.distributorId),
          warehouseName: values.warehouseName.trim(),
          sapAgencyCode: values.sapAgencyCode.trim(),
          latitude: Number(values.latitude),
          longitude: Number(values.longitude),
          isActive: values.isActive,
        }
        return updateAgencyWarehouseMapping(payload)
      }

      const payload: CreateAgencyWarehouseRequest = {
        userId: user?.userId ?? 0,
        distributorId: Number(values.distributorId),
        warehouseName: values.warehouseName.trim(),
        sapAgencyCode: values.sapAgencyCode.trim(),
        latitude: Number(values.latitude),
        longitude: Number(values.longitude),
        isActive: values.isActive,
      }
      return createAgencyWarehouseMapping(payload)
    },
    onSuccess: async (data, values) => {
      const payload = data?.payload
      if (payload) {
        queryClient.setQueryData<ApiResponse<AgencyWarehouseDTO[]>>(
          ['agencyWarehouses'],
          (old) => {
            if (!old || !Array.isArray(old.payload)) return old
            if (mode === 'edit') {
              const updatedPayload = old.payload.map((item) =>
                String(item.id) === String(payload.id) ? { ...item, ...payload } : item
              )
              return { ...old, payload: updatedPayload }
            }
            const withoutExisting = old.payload.filter(
              (item) => String(item.id) !== String(payload.id)
            )
            return { ...old, payload: [payload, ...withoutExisting] }
          }
        )
      }
      toast.success(
        mode === 'edit'
          ? 'Warehouse mapping updated successfully'
          : 'Warehouse mapping created successfully'
      )
      await queryClient.invalidateQueries({ queryKey: ['agencyWarehouses'] })
      await onSubmit?.(values)
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : mode === 'edit'
            ? 'Failed to update warehouse mapping'
            : 'Failed to create warehouse mapping'
      toast.error(message)
    },
  })

  const isSubmitting = form.formState.isSubmitting || mutation.isPending

  const handleSubmit = (values: WarehouseMappingFormValues) => {
    if (requireRange && !values.rangeId) {
      form.setError('rangeId', {
        type: 'manual',
        message: 'Please select a range',
      })
      return
    }
    mutation.mutate(values)
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className='flex flex-col gap-4'
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
                      distributorsData.map((distributor, index) => (
                        <SelectItem
                          key={`${distributor.id}-${index}`}
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
          name='warehouseName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Warehouse Name</FormLabel>
              <FormControl>
                <Input
                  placeholder='Warehouse Name'
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='sapAgencyCode'
          render={({ field }) => (
            <FormItem>
              <FormLabel>SAP Agency Code</FormLabel>
              <FormControl>
                <Input
                  placeholder='SAP Agency Code'
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='latitude'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Latitude</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  step='any'
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='longitude'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Longitude</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  step='any'
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='isActive'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center gap-2'>
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

        <div className='flex gap-2'>
          <Button
            type='button'
            variant='outline'
            className='w-full flex-1'
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            className='w-full flex-1'
            disabled={isSubmitting}
          >
            {isSubmitting
              ? mode === 'edit'
                ? 'Updating...'
                : 'Creating...'
              : mode === 'edit'
                ? 'Update'
                : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
