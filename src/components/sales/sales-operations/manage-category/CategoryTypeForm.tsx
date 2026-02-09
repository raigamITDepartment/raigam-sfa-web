import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  addCategoryType,
  updateCategoryType,
  type AddCategoryTypePayload,
  type UpdateCategoryTypePayload,
} from '@/services/sales/itemApi'
import { useAppSelector } from '@/store/hooks'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const categoryTypeSchema = z.object({
  categoryType: z.string().min(1, 'Please enter category type'),
  isActive: z.boolean().default(true),
})

type CategoryTypeFormInput = z.input<typeof categoryTypeSchema>
export type CategoryTypeFormValues = z.output<typeof categoryTypeSchema>

type CategoryTypeFormProps = {
  mode: 'create' | 'edit'
  categoryTypeId?: number
  catTypeSeq?: number
  initialValues?: Partial<CategoryTypeFormValues>
  onSubmit?: (values: CategoryTypeFormValues) => void | Promise<void>
  onCancel?: () => void
}

const CategoryTypeForm = ({
  mode,
  categoryTypeId,
  catTypeSeq,
  initialValues,
  onSubmit,
  onCancel,
}: CategoryTypeFormProps) => {
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)

  const form = useForm<CategoryTypeFormInput, any, CategoryTypeFormValues>({
    resolver: zodResolver(categoryTypeSchema),
    defaultValues: {
      categoryType: '',
      isActive: true,
      ...initialValues,
    },
  })

  useEffect(() => {
    form.reset({
      categoryType: initialValues?.categoryType ?? '',
      isActive: initialValues?.isActive ?? true,
    })
  }, [form, initialValues])

  const createMutation = useMutation({
    mutationFn: async (values: CategoryTypeFormValues) => {
      const payload: AddCategoryTypePayload = {
        userId: user?.userId ?? 0,
        categoryType: values.categoryType,
        isActive: values.isActive,
      }
      return addCategoryType(payload)
    },
    onSuccess: async (_, values) => {
      toast.success('Category type created successfully')
      queryClient.invalidateQueries({ queryKey: ['category-type'] })
      await onSubmit?.(values)
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to create category type'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (values: CategoryTypeFormValues) => {
      const payload: UpdateCategoryTypePayload = {
        id: categoryTypeId ?? 0,
        userId: user?.userId ?? 0,
        categoryType: values.categoryType,
        catTypeSeq: catTypeSeq ?? 0,
        isActive: values.isActive,
      }
      return updateCategoryType(payload)
    },
    onSuccess: async (_, values) => {
      toast.success('Category type updated successfully')
      queryClient.invalidateQueries({ queryKey: ['category-type'] })
      await onSubmit?.(values)
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to update category type'
      toast.error(message)
    },
  })

  const handleSubmit = async (values: CategoryTypeFormValues) => {
    if (mode === 'create') {
      await createMutation.mutateAsync(values)
    } else if (mode === 'edit' && categoryTypeId != null) {
      await updateMutation.mutateAsync(values)
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
        className='flex flex-col gap-4'
      >
        <FormField
          control={form.control}
          name='categoryType'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Type</FormLabel>
              <FormControl>
                <Input placeholder='Category Type' {...field} />
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
                <Switch
                  checked={field.value}
                  onCheckedChange={(value) => field.onChange(!!value)}
                  aria-label='Active status'
                />
              </FormControl>
              <FormLabel className='m-0'>
                {field.value ? 'Active' : 'Inactive'}
              </FormLabel>
            </FormItem>
          )}
        />
        <div className='mt-4 flex flex-col gap-2 sm:flex-row'>
          <Button
            type='button'
            variant='outline'
            className='w-full sm:flex-1'
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Discard
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

export default CategoryTypeForm
