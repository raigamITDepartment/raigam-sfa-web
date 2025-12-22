import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addSubSubCategory,
  editSubSubCategory,
  getAllSubcategory,
  type AddSubSubCategoryPayload,
  type SubCategoryOne,
  type UpdateSubSubCategoryPayload,
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

const subSubCategorySchema = z.object({
  subOneId: z.string().min(1, 'Please select sub category'),
  subCatTwoName: z.string().min(1, 'Please enter sub sub category name'),
  subSeq: z.string().optional(),
  isActive: z.boolean().default(true),
})

type SubSubCategoryFormInput = z.input<typeof subSubCategorySchema>
export type SubSubCategoryFormValues = z.output<typeof subSubCategorySchema>

type SubSubCategoryFormProps = {
  mode: 'create' | 'edit'
  subSubCategoryId?: number
  subSeq?: number
  initialValues?: Partial<SubSubCategoryFormValues>
  onSubmit?: (values: SubSubCategoryFormValues) => void | Promise<void>
  onCancel?: () => void
}

const SubSubCategoryForm = ({
  mode,
  subSubCategoryId,
  subSeq,
  initialValues,
  onSubmit,
  onCancel,
}: SubSubCategoryFormProps) => {
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)

  const { data: subCategoriesData } = useQuery({
    queryKey: ['sub-categories'],
    queryFn: getAllSubcategory,
  })

  const options = useMemo(
    () => (subCategoriesData?.payload ?? []) as SubCategoryOne[],
    [subCategoriesData]
  )

  const form = useForm<SubSubCategoryFormInput, any, SubSubCategoryFormValues>({
    resolver: zodResolver(subSubCategorySchema),
    defaultValues: {
      subOneId: '',
      subCatTwoName: '',
      subSeq: '',
      isActive: true,
      ...initialValues,
    },
  })

  useEffect(() => {
    form.reset({
      subOneId: initialValues?.subOneId ?? '',
      subCatTwoName: initialValues?.subCatTwoName ?? '',
      subSeq: initialValues?.subSeq ?? '',
      isActive: initialValues?.isActive ?? true,
    })
  }, [form, initialValues])

  const createMutation = useMutation({
    mutationFn: async (values: SubSubCategoryFormValues) => {
      const payload: AddSubSubCategoryPayload = {
        userId: user?.userId ?? 0,
        subOneId: Number(values.subOneId),
        subCatTwoName: values.subCatTwoName,
        isActive: values.isActive,
      }
      return addSubSubCategory(payload)
    },
    onSuccess: async (_, values) => {
      toast.success('Sub sub category created successfully')
      queryClient.invalidateQueries({ queryKey: ['sub-sub-categories'] })
      await onSubmit?.(values)
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to create sub sub category'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (values: SubSubCategoryFormValues) => {
      const payload: UpdateSubSubCategoryPayload = {
        id: subSubCategoryId ?? 0,
        userId: user?.userId ?? 0,
        subOneId: Number(values.subOneId),
        subSeq: Number(values.subSeq ?? subSeq ?? 0),
        subCatTwoName: values.subCatTwoName,
        isActive: values.isActive,
      }
      return editSubSubCategory(payload)
    },
    onSuccess: async (_, values) => {
      toast.success('Sub sub category updated successfully')
      queryClient.invalidateQueries({ queryKey: ['sub-sub-categories'] })
      await onSubmit?.(values)
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to update sub sub category'
      toast.error(message)
    },
  })

  const handleSubmit = async (values: SubSubCategoryFormValues) => {
    if (mode === 'create') {
      await createMutation.mutateAsync(values)
    } else if (mode === 'edit' && subSubCategoryId != null) {
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
    mode === 'create' ? 'Create Sub Sub Category' : 'Update Sub Sub Category'

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className='flex flex-col gap-4'
      >
        <FormField
          control={form.control}
          name='subOneId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sub Category</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select Sub Category' />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.subCatOneName}
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
          name='subCatTwoName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sub Sub Category</FormLabel>
              <FormControl>
                <Input placeholder='Sub Sub Category Name' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='subSeq'
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

export default SubSubCategoryForm
