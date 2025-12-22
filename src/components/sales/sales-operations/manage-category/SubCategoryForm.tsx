import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSubCategory,
  editSubCategory,
  getItemMainCategories,
  type CreateSubCategoryPayload,
  type ItemMainCategory,
  type UpdateSubCategoryPayload,
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

const subCategorySchema = z.object({
  mainCatId: z.string().min(1, 'Please select main category'),
  subCatOneName: z.string().min(1, 'Please enter sub category name'),
  subCatSeq: z.string().optional(),
  isActive: z.boolean().default(true),
})

type SubCategoryFormInput = z.input<typeof subCategorySchema>
export type SubCategoryFormValues = z.output<typeof subCategorySchema>

type SubCategoryFormProps = {
  mode: 'create' | 'edit'
  subCategoryId?: number
  subCatSeq?: number
  initialValues?: Partial<SubCategoryFormValues>
  onSubmit?: (values: SubCategoryFormValues) => void | Promise<void>
  onCancel?: () => void
}

const SubCategoryForm = ({
  mode,
  subCategoryId,
  subCatSeq,
  initialValues,
  onSubmit,
  onCancel,
}: SubCategoryFormProps) => {
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)

  const { data: mainCategoriesData } = useQuery({
    queryKey: ['main-categories'],
    queryFn: getItemMainCategories,
  })

  const options = useMemo(
    () => (mainCategoriesData?.payload ?? []) as ItemMainCategory[],
    [mainCategoriesData]
  )

  const form = useForm<SubCategoryFormInput, any, SubCategoryFormValues>({
    resolver: zodResolver(subCategorySchema),
    defaultValues: {
      mainCatId: '',
      subCatOneName: '',
      subCatSeq: '',
      isActive: true,
      ...initialValues,
    },
  })

  useEffect(() => {
    form.reset({
      mainCatId: initialValues?.mainCatId ?? '',
      subCatOneName: initialValues?.subCatOneName ?? '',
      subCatSeq: initialValues?.subCatSeq ?? '',
      isActive: initialValues?.isActive ?? true,
    })
  }, [form, initialValues])

  const createMutation = useMutation({
    mutationFn: async (values: SubCategoryFormValues) => {
      const payload: CreateSubCategoryPayload = {
        userId: user?.userId ?? 0,
        mainCatId: Number(values.mainCatId),
        subCatOneName: values.subCatOneName,
        isActive: values.isActive,
      }
      return createSubCategory(payload)
    },
    onSuccess: async (_, values) => {
      toast.success('Sub category created successfully')
      queryClient.invalidateQueries({ queryKey: ['sub-categories'] })
      await onSubmit?.(values)
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to create sub category'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (values: SubCategoryFormValues) => {
      const payload: UpdateSubCategoryPayload = {
        id: subCategoryId ?? 0,
        userId: user?.userId ?? 0,
        mainCatId: Number(values.mainCatId),
        subCatSeq: Number(values.subCatSeq ?? subCatSeq ?? 0),
        subCatOneName: values.subCatOneName,
        isActive: values.isActive,
      }
      return editSubCategory(payload)
    },
    onSuccess: async (_, values) => {
      toast.success('Sub category updated successfully')
      queryClient.invalidateQueries({ queryKey: ['sub-categories'] })
      await onSubmit?.(values)
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to update sub category'
      toast.error(message)
    },
  })

  const handleSubmit = async (values: SubCategoryFormValues) => {
    if (mode === 'create') {
      await createMutation.mutateAsync(values)
    } else if (mode === 'edit' && subCategoryId != null) {
      await updateMutation.mutateAsync(values)
    } else {
      await onSubmit?.(values)
    }
  }

  const isSubmitting =
    form.formState.isSubmitting ||
    createMutation.isPending ||
    updateMutation.isPending
  const submitLabel =
    mode === 'create' ? 'Create Sub Category' : 'Update Sub Category'

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className='flex flex-col gap-4'
      >
        <FormField
          control={form.control}
          name='mainCatId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Main Category</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select Main Category' />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.itemMainCat}
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
          name='subCatOneName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sub Category</FormLabel>
              <FormControl>
                <Input placeholder='Sub Category Name' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='subCatSeq'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sequence</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  min='0'
                  placeholder='Sequence'
                  {...field}
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

export default SubCategoryForm
