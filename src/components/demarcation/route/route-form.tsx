import { z } from 'zod'
import { useForm, type FieldErrors } from 'react-hook-form'
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

const toNumberValue = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const normalizeOldRouteCode = (value: string | number | undefined) => {
  if (value === undefined || value === null) return '0'
  if (typeof value === 'number') return value
  const trimmed = value.trim()
  if (!trimmed) return '0'
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : trimmed
}

const baseRouteFormSchema = z.object({
  id: z.string().optional(),
  areaId: z.string().optional(),
  territoryId: z.string().min(1, 'Please select a territory'),
  routeCode: numericRequiredString,
  routeName: z.string().min(1, 'Please enter route name'),
  displayOrder: z
    .coerce.number()
    .min(0, 'Display order must be zero or greater')
    .optional(),
  oldRouteId: z.string().optional(),
  oldRouteCode: z.union([z.string(), z.number()]).optional(),
  isActive: z.boolean().default(true),
})

const createRouteFormSchema = baseRouteFormSchema.extend({
  displayOrder: z
    .coerce.number()
    .min(0, 'Display order must be zero or greater'),
})

const editRouteFormSchema = z.object({
  id: z.string().optional(),
  areaId: z.string().optional(),
  territoryId: z.string().min(1, 'Please select a territory'),
  routeCode: numericRequiredString,
  routeName: z.string().min(1, 'Please enter route name'),
  isActive: z.boolean().default(true),
})

export type RouteFormInput = z.input<typeof baseRouteFormSchema>
export type RouteFormValues = z.output<typeof baseRouteFormSchema>

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
    resolver: zodResolver(isEditMode ? editRouteFormSchema : createRouteFormSchema),
    defaultValues: {
      id: '',
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

  useEffect(() => {
    form.reset({
      id: '',
      territoryId: '',
      routeCode: '',
      routeName: '',
      displayOrder: 0,
      areaId: '',
      oldRouteId: mode === 'create' ? '0' : '',
      oldRouteCode: mode === 'create' ? '0' : '',
      isActive: true,
      ...initialValues,
    })
  }, [form, initialValues, mode])

  const fallbackDisplayOrder = toNumberValue(initialValues?.displayOrder)
  const fallbackOldRouteId = toNumberValue(initialValues?.oldRouteId)
  const fallbackOldRouteCode = normalizeOldRouteCode(
    initialValues?.oldRouteCode as string | number | undefined
  )

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
      const resolvedDisplayOrder =
        toNumberValue(values.displayOrder) ?? fallbackDisplayOrder ?? 0
      const resolvedOldRouteId =
        toNumberValue(values.oldRouteId) ?? fallbackOldRouteId ?? 0
      const resolvedOldRouteCode = normalizeOldRouteCode(
        values.oldRouteCode ?? fallbackOldRouteCode
      )
      const payload: CreateRouteRequest = {
        territoryId: Number(values.territoryId),
        userId: user?.userId ?? 0,
        routeName: values.routeName,
        routeCode: values.routeCode,
        displayOrder: resolvedDisplayOrder,
        isActive: values.isActive,
        oldRouteId: resolvedOldRouteId,
        oldRouteCode: resolvedOldRouteCode,
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
      const resolvedDisplayOrder =
        toNumberValue(values.displayOrder) ?? fallbackDisplayOrder ?? 0
      const resolvedOldRouteId =
        toNumberValue(values.oldRouteId) ?? fallbackOldRouteId ?? 0
      const resolvedOldRouteCode = normalizeOldRouteCode(
        values.oldRouteCode ?? fallbackOldRouteCode
      )
      const payload: UpdateRouteRequest = {
        id,
        territoryId: Number(values.territoryId),
        userId: user?.userId ?? 0,
        routeName: values.routeName,
        routeCode: values.routeCode,
        displayOrder: resolvedDisplayOrder,
        isActive: values.isActive,
        oldRouteId: resolvedOldRouteId,
        oldRouteCode: resolvedOldRouteCode,
      }
      return updateRoute(payload)
    },
    onSuccess: (data, { id, values }) => {
      toast.success('Route updated successfully')
      const resolvedTerritory = displayedTerritoryOptions.find(
        (territory) => String(territory.id) === String(values.territoryId)
      )
      const resolvedTerritoryName =
        (resolvedTerritory?.territoryName as string | undefined) ??
        (resolvedTerritory?.name as string | undefined) ??
        ''
      const resolvedTerritoryId = values.territoryId
        ? Number(values.territoryId)
        : undefined
      const resolvedOldRouteId =
        toNumberValue(values.oldRouteId) ?? fallbackOldRouteId
      const resolvedOldRouteCode =
        normalizeOldRouteCode(values.oldRouteCode ?? fallbackOldRouteCode)
      const payload = data.payload as RouteDTO | undefined
      const resolvedActive =
        (payload?.isActive as boolean | undefined) ??
        (payload?.active as boolean | undefined) ??
        values.isActive
      const resolvedStatus =
        payload?.status ?? (resolvedActive ? 'Active' : 'Inactive')

      queryClient.setQueryData<ApiResponse<RouteDTO[]>>(['routes'], (old) => {
        if (!old || !Array.isArray(old.payload)) return old
        const updated = old.payload.map((route) => {
          const routeId =
            (route.id as Id | undefined) ??
            (route.routeId as Id | undefined) ??
            (route.routeCode as Id | undefined)
          if (String(routeId) !== String(id)) return route

          return {
            ...route,
            ...payload,
            id: (payload?.id as Id | undefined) ?? id,
            routeId: (payload?.routeId as Id | undefined) ?? route.routeId,
            territoryId:
              (payload?.territoryId as Id | undefined) ??
              resolvedTerritoryId ??
              route.territoryId,
            ...(resolvedTerritoryName
              ? {
                  territoryName:
                    (payload?.territoryName as string | undefined) ??
                    resolvedTerritoryName,
                }
              : {}),
            routeCode: payload?.routeCode ?? values.routeCode ?? route.routeCode,
            routeName: payload?.routeName ?? values.routeName ?? route.routeName,
            displayOrder:
              payload?.displayOrder ?? values.displayOrder ?? route.displayOrder,
            oldRouteId:
              payload?.oldRouteId ?? resolvedOldRouteId ?? route.oldRouteId,
            oldRouteCode:
              payload?.oldRouteCode ??
              resolvedOldRouteCode ??
              route.oldRouteCode,
            isActive: resolvedActive,
            active: (payload?.active as boolean | undefined) ?? resolvedActive,
            status: resolvedStatus,
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
      const resolvedId =
        values.id !== undefined && values.id !== '' ? values.id : routeId
      await updateMutation.mutateAsync({ id: resolvedId, values })
    } else if (mode === 'edit') {
      const resolvedId =
        values.id !== undefined && values.id !== '' ? values.id : routeId
      if (resolvedId === undefined || resolvedId === null || resolvedId === '') {
        toast.error('Route ID is missing. Please reopen and try again.')
        return
      }
      await updateMutation.mutateAsync({ id: resolvedId, values })
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

  const handleInvalid = (errors: FieldErrors<RouteFormInput>) => {
    const entries = Object.entries(errors)
    if (!entries.length) {
      toast.error('Please fill the required fields before updating.')
      return
    }
    const details = entries
      .map(([key, value]) => {
        const message =
          value && 'message' in value && value.message
            ? String(value.message)
            : 'Invalid value'
        return `${key}: ${message}`
      })
      .join(' | ')
    toast.error(details)
    if (import.meta.env.DEV) {
      console.warn('[RouteForm] validation errors', errors)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit, handleInvalid)}
        className='flex flex-col gap-3'
      >
        <input type='hidden' {...form.register('id')} />
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
              {...form.register('displayOrder')}
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
            type='button'
            variant='outline'
            className='w-full sm:flex-1'
            disabled={isSubmitting}
            onClick={onCancel}
          >
            {isEditMode ? 'Discard' : 'Cancel'}
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
