import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addItemMainCategory,
  editMainCategory,
  getAllCategoryType,
  type AddItemMainCategoryPayload,
  type CategoryType,
  type UpdateItemMainCategoryPayload,
} from '@/services/sales/itemApi'
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

const mainCategorySchema = z.object({
  catTypeId: z.string().min(1, 'Please select category type'),
  itemMainCat: z.string().min(1, 'Please enter main category name'),
  isActive: z.boolean().default(true),
})

type MainCategoryFormInput = z.input<typeof mainCategorySchema>
export type MainCategoryFormValues = z.output<typeof mainCategorySchema>

type MainCategoryFormProps = {
  mode: 'create' | 'edit'
  mainCategoryId?: number
  mainCatSeq?: number
  initialValues?: Partial<MainCategoryFormValues>
  onSubmit?: (values: MainCategoryFormValues) => void | Promise<void>
  onCancel?: () => void
}

const MainCategoryForm = ({
  mode,
  mainCategoryId,
  mainCatSeq,
  initialValues,
  onSubmit,
  onCancel,
}: MainCategoryFormProps) => {
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)

  const { data: categoryTypes } = useQuery({
    queryKey: ['category-type'],
    queryFn: getAllCategoryType,
  })

  const options = useMemo(
    () => (categoryTypes?.payload ?? []) as CategoryType[],
    [categoryTypes]
  )

  const form = useForm<MainCategoryFormInput, any, MainCategoryFormValues>({
    resolver: zodResolver(mainCategorySchema),
    defaultValues: {
      catTypeId: '',
      itemMainCat: '',
      isActive: true,
      ...initialValues,
    },
  })

  useEffect(() => {
    form.reset({
      catTypeId: initialValues?.catTypeId ?? '',
      itemMainCat: initialValues?.itemMainCat ?? '',
      isActive: initialValues?.isActive ?? true,
    })
  }, [form, initialValues])

  const createMutation = useMutation({
    mutationFn: async (values: MainCategoryFormValues) => {
      const payload: AddItemMainCategoryPayload = {
        userId: user?.userId ?? 0,
        catTypeId: Number(values.catTypeId),
        itemMainCat: values.itemMainCat,
        isActive: values.isActive,
      }
      return addItemMainCategory(payload)
    },
    onSuccess: async (_, values) => {
      toast.success('Main category created successfully')
      queryClient.invalidateQueries({ queryKey: ['main-categories'] })
      await onSubmit?.(values)
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to create main category'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (values: MainCategoryFormValues) => {
      const payload: UpdateItemMainCategoryPayload = {
        id: mainCategoryId ?? 0,
        userId: user?.userId ?? 0,
        catTypeId: Number(values.catTypeId),
        itemMainCat: values.itemMainCat,
        mainCatSeq: mainCatSeq ?? 0,
        isActive: values.isActive,
      }
      return editMainCategory(payload)
    },
    onSuccess: async (_, values) => {
      toast.success('Main category updated successfully')
      queryClient.invalidateQueries({ queryKey: ['main-categories'] })
      await onSubmit?.(values)
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to update main category'
      toast.error(message)
    },
  })

  const handleSubmit = async (values: MainCategoryFormValues) => {
    if (mode === 'create') {
      await createMutation.mutateAsync(values)
    } else if (mode === 'edit' && mainCategoryId != null) {
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
          name='catTypeId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Type</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select Category Type' />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.categoryType}
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
          name='itemMainCat'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Main Category Name</FormLabel>
              <FormControl>
                <Input placeholder='Main Category Name' {...field} />
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

export default MainCategoryForm
