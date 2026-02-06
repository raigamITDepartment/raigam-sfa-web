import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ApiResponse,
  CreateRouteRequest,
  Id,
  RouteDTO,
  TerritoryDTO,
  AreaDTO,
  UpdateRouteRequest,
} from '@/services/userDemarcationApi'
import {
  createRoute,
  getAllArea,
  getTerritoriesByAreaId,
  updateRoute,
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

const numericRequiredString = z
  .preprocess((value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return undefined
      return trimmed
    }
    return value
  }, z.coerce.number())
  .refine((val) => !Number.isNaN(val), {
    message: 'Please enter route code',
  })

const routeFormSchema = z.object({
  areaId: z.string().optional(),
  territoryId: z.string().min(1, 'Please select a territory'),
  routeCode: numericRequiredString,
  routeName: z.string().min(1, 'Please enter route name'),
  displayOrder: z
    .coerce.number()
    .min(0, 'Display order must be zero or greater'),
  oldRouteId: z.string().optional(),
  oldRouteCode: z.string().optional(),
  isActive: z.boolean().default(true),
})

export type RouteFormInput = z.input<typeof routeFormSchema>
export type RouteFormValues = z.output<typeof routeFormSchema>

export type RouteFormMode = 'create' | 'edit'

type RouteFormProps = {
  mode: RouteFormMode
  routeId?: Id
  initialValues?: Partial<RouteFormInput>
  onSubmit?: (values: RouteFormValues) => void | Promise<void>
  onCancel?: () => void
  initialTerritoryName?: string
}

export function RouteForm(props: RouteFormProps) {
  const { mode, routeId, initialValues, onSubmit, onCancel, initialTerritoryName } =
    props
  const isEditMode = mode === 'edit'
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)

  const { data: areas } = useQuery({
    queryKey: ['user-demarcation', 'areas'],
    queryFn: async () => {
      const res = (await getAllArea()) as ApiResponse<AreaDTO[]>
      return res.payload
    },
  })

  const form = useForm<RouteFormInput, any, RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      territoryId: '',
      routeCode: '',
      routeName: '',
      displayOrder: 0,
      areaId: '',
      oldRouteId: mode === 'create' ? '0' : '',
      oldRouteCode: mode === 'create' ? '0' : '',
      isActive: true,
      ...initialValues,
    },
  })

  const selectedAreaId = form.watch('areaId')
  const selectedTerritoryId = form.watch('territoryId')
  const {
    data: territoryOptions = [],
    isFetching: isLoadingTerritories,
  } = useQuery<TerritoryDTO[]>({
      queryKey: ['user-demarcation', 'territories', 'by-area', selectedAreaId],
      queryFn: async () => {
        if (!selectedAreaId) return []
        const res = await getTerritoriesByAreaId(Number(selectedAreaId))
        return (res.payload ?? []) as TerritoryDTO[]
      },
      enabled: Boolean(selectedAreaId),
      staleTime: 5 * 60 * 1000,
    })

  useEffect(() => {
    if (!selectedAreaId && !isEditMode) {
      form.setValue('territoryId', '')
    }
  }, [selectedAreaId, form, isEditMode])

  const fallbackTerritoryOption = useMemo(() => {
    if (!isEditMode) return undefined
    if (!initialTerritoryName) return undefined
    if (!selectedTerritoryId) return undefined
    const exists = territoryOptions.some(
      (territory) => String(territory.id) === String(selectedTerritoryId)
    )
    if (exists) return undefined
    return {
      id: selectedTerritoryId,
      territoryName: initialTerritoryName,
      isActive: true,
    } as TerritoryDTO
  }, [
    isEditMode,
    initialTerritoryName,
    selectedTerritoryId,
    territoryOptions,
  ])

  const displayedTerritoryOptions = useMemo(() => {
    if (fallbackTerritoryOption) {
      return [...territoryOptions, fallbackTerritoryOption]
    }
    return territoryOptions
  }, [territoryOptions, fallbackTerritoryOption])

  const createMutation = useMutation({
    mutationFn: async (values: RouteFormValues) => {
      const payload: CreateRouteRequest = {
        territoryId: Number(values.territoryId),
        userId: user?.userId ?? 0,
        routeName: values.routeName,
        routeCode: values.routeCode,
        displayOrder: values.displayOrder,
        isActive: values.isActive,
      }
      if (values.oldRouteId) {
        payload.oldRouteId = Number(values.oldRouteId)
      }
      if (values.oldRouteCode) {
        payload.oldRouteCode = values.oldRouteCode
      }
      return createRoute(payload)
    },
    onSuccess: (data, values) => {
      toast.success('Route created successfully')
      const resolvedTerritory = displayedTerritoryOptions.find(
        (territory) => String(territory.id) === String(values.territoryId)
      )
      const resolvedTerritoryName =
        (resolvedTerritory?.territoryName as string | undefined) ??
        (resolvedTerritory?.name as string | undefined) ??
        ''
      const createdPayload = data.payload
        ? {
            ...data.payload,
            territoryId:
              (data.payload as RouteDTO).territoryId ??
              Number(values.territoryId),
            territoryName:
              (data.payload as RouteDTO).territoryName ?? resolvedTerritoryName,
          }
        : data.payload
      queryClient.setQueryData<ApiResponse<RouteDTO[]>>(['routes'], (old) => {
        if (!old) {
          return {
            ...data,
            payload: createdPayload ? [createdPayload] : [],
          }
        }
        if (!Array.isArray(old.payload)) return old
        return {
          ...old,
          payload: createdPayload
            ? [createdPayload, ...old.payload]
            : old.payload,
        }
      })
      void onSubmit?.(values)
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to create route'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (params: {
      id: Id
      values: RouteFormValues
    }) => {
      const { id, values } = params
      const payload: UpdateRouteRequest = {
        id,
        territoryId: Number(values.territoryId),
        userId: user?.userId ?? 0,
        routeName: values.routeName,
        routeCode: values.routeCode,
        displayOrder: values.displayOrder,
        isActive: values.isActive,
      }
      if (values.oldRouteId) {
        payload.oldRouteId = Number(values.oldRouteId)
      }
      if (values.oldRouteCode) {
        payload.oldRouteCode = values.oldRouteCode
      }
      return updateRoute(payload)
    },
    onSuccess: (data, { id, values }) => {
      toast.success('Route updated successfully')
      queryClient.setQueryData<ApiResponse<RouteDTO[]>>(['routes'], (old) => {
        if (!old || !Array.isArray(old.payload)) return old
        const updated = old.payload.map((route) => {
          if (String(route.id) !== String(id)) return route
          return {
            ...route,
            ...data.payload,
          }
        })
        return {
          ...old,
          payload: updated,
        }
      })
      void onSubmit?.(values)
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to update route'
      toast.error(message)
    },
  })

  const handleSubmit = async (values: RouteFormValues) => {
    if (mode === 'create') {
      await createMutation.mutateAsync(values)
    } else if (mode === 'edit' && routeId != null) {
      await updateMutation.mutateAsync({ id: routeId, values })
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
        {!isEditMode ? (
          <FormField
            control={form.control}
            name='areaId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Area</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      form.setValue('territoryId', '')
                    }}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select Area' />
                    </SelectTrigger>
                    <SelectContent>
                      {(areas ?? [])
                        .filter((area) => area.isActive ?? area.active)
                        .map((area) => (
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
        ) : (
          <input type='hidden' {...form.register('areaId')} />
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
                  disabled={
                    (!selectedAreaId && !isEditMode) || isLoadingTerritories
                  }
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue
                      placeholder={
                        selectedAreaId || isEditMode
                          ? isLoadingTerritories
                            ? 'Loading territories...'
                            : 'Select Territory'
                          : 'Select an Area first'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {displayedTerritoryOptions
                      .filter((territory) => territory.isActive ?? territory.active)
                      .map((territory) => (
                        <SelectItem key={territory.id} value={String(territory.id)}>
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
          name='routeCode'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Route Code</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  placeholder='Route Code'
                  {...field}
                  value={
                    field.value === undefined || field.value === null
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
          name='routeName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Route Name</FormLabel>
              <FormControl>
                <Input placeholder='Route Name' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isEditMode ? (
          <>
            <FormField
              control={form.control}
              name='displayOrder'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Order</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      {...field}
                      value={
                        field.value === undefined || field.value === null
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
              name='oldRouteCode'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Old Route Code</FormLabel>
                  <p className='text-xs text-muted-foreground mb-1'>
                    If available, please enter old Route code
                  </p>
                  <FormControl>
                    <Input placeholder='Old Route Code' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='oldRouteId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Old Route ID</FormLabel>
                  <p className='text-xs text-muted-foreground mb-1'>
                    If available, please enter old Route Id
                  </p>
                  <FormControl>
                    <Input type='number' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : (
          <>
            <input
              type='hidden'
              {...form.register('displayOrder', { valueAsNumber: true })}
            />
            <input type='hidden' {...form.register('oldRouteCode')} />
            <input type='hidden' {...form.register('oldRouteId')} />
          </>
        )}

        <FormField
          control={form.control}
          name='isActive'
          render={({ field }) => (
            <FormItem className='mt-1 flex items-center gap-2'>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(isChecked) => field.onChange(!!isChecked)}
                />
              </FormControl>
              <FormLabel className='m-0'>Is Active</FormLabel>
            </FormItem>
          )}
        />

        <div className='mt-2 flex flex-col gap-2 sm:flex-row'>
          <Button
            type='submit'
            className={`w-full sm:flex-1 ${isEditMode ? 'order-1 sm:order-none' : ''}`}
            disabled={isSubmitting}
          >
            {submitLabel}
          </Button>
          <Button
            type='button'
            variant={isEditMode ? 'destructive' : 'outline'}
            className='w-full sm:flex-1'
            disabled={isSubmitting}
            onClick={onCancel}
          >
            {isEditMode ? 'Discard' : 'Cancel'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
