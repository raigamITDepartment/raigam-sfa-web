import { AxiosError } from 'axios'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type ApiResponse,
  type AreaDTO,
  type CreateAreaRequest,
  type UpdateAreaRequest,
  type Id,
} from '@/services/userDemarcationApi'
import { createArea, updateArea } from '@/services/userDemarcationApi'
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

const areaFormSchema = z.object({
  areaCode: z.string().min(1, 'Please enter area code'),
  areaName: z.string().min(1, 'Please enter area name'),
  displayOrder: z.coerce
    .number()
    .int('Display order must be an integer')
    .nonnegative('Display order must be positive'),
  isActive: z.boolean().default(true),
})

type AreaFormInput = z.input<typeof areaFormSchema>
export type AreaFormValues = z.output<typeof areaFormSchema>

type AreaFormProps = {
  mode: 'create' | 'edit'
  areaId?: Id
  initialValues?: Partial<AreaFormValues>
  onSubmit?: (values: AreaFormValues) => void | Promise<void>
  onCancel?: () => void
}

const sanitizeApiMessage = (message: string | undefined) => {
  if (!message) return ''
  // Strip noisy SQL fragments if present
  const trimmed = message.replace(/\s*\[insert into[\s\S]*$/i, '').trim()
  return trimmed || message
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiResponse<unknown> | undefined
    return (
      sanitizeApiMessage(data?.message) ||
      sanitizeApiMessage(error.message) ||
      fallback
    )
  }
  if (error instanceof Error) return error.message
  return fallback
}

export function AreaForm(props: AreaFormProps) {
  const { mode, areaId, initialValues, onSubmit, onCancel } = props
  const queryClient = useQueryClient()
  const user = useAppSelector((s) => s.auth.user)

  const form = useForm<AreaFormInput, any, AreaFormValues>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: {
      areaCode: '',
      areaName: '',
      displayOrder: 0,
      isActive: true,
      ...initialValues,
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: AreaFormValues) => {
      const payload: CreateAreaRequest = {
        userId: user?.userId ?? 0,
        areaName: values.areaName,
        areaCode: values.areaCode,
        displayOrder: values.displayOrder,
        isActive: values.isActive,
      }
      return createArea(payload)
    },
    onSuccess: async (data, variables) => {
      toast.success('Area created successfully')
      queryClient.setQueryData<ApiResponse<AreaDTO[]>>(['areas'], (old) => {
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
      const message = getApiErrorMessage(error, 'Failed to create area')
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (input: { id: Id; values: AreaFormValues }) => {
      const { id, values } = input
      const payload: UpdateAreaRequest = {
        id,
        userId: user?.userId ?? 0,
        areaName: values.areaName,
        areaCode: values.areaCode,
        displayOrder: values.displayOrder,
        isActive: values.isActive,
      }
      return updateArea(payload)
    },
    onSuccess: async (data, { values }) => {
      toast.success('Area updated successfully')
      queryClient.setQueryData<ApiResponse<AreaDTO[]>>(['areas'], (old) => {
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
      const message = getApiErrorMessage(error, 'Failed to update area')
      toast.error(message)
    },
  })

  const handleSubmit = async (values: AreaFormValues) => {
    if (mode === 'create') {
      await createMutation.mutateAsync(values)
    } else if (mode === 'edit' && areaId != null) {
      await updateMutation.mutateAsync({ id: areaId, values })
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
          name='areaCode'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Area Code</FormLabel>
              <FormControl>
                <Input placeholder='Area Code' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='areaName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Area Name</FormLabel>
              <FormControl>
                <Input placeholder='Area Name' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
