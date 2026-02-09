import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  addFlavour,
  editFlavour,
  type AddFlavourPayload,
  type UpdateFlavourPayload,
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

const flavourSchema = z.object({
  subCatThreeName: z.string().min(1, 'Please enter flavour name'),
  isActive: z.boolean().default(true),
})

type FlavourFormInput = z.input<typeof flavourSchema>
export type FlavourFormValues = z.output<typeof flavourSchema>

type FlavourFormProps = {
  mode: 'create' | 'edit'
  flavourId?: number
  initialValues?: Partial<FlavourFormValues>
  onSubmit?: (values: FlavourFormValues) => void | Promise<void>
  onCancel?: () => void
}

const FlavourForm = ({
  mode,
  flavourId,
  initialValues,
  onSubmit,
  onCancel,
}: FlavourFormProps) => {
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)

  const form = useForm<FlavourFormInput, any, FlavourFormValues>({
    resolver: zodResolver(flavourSchema),
    defaultValues: {
      subCatThreeName: '',
      isActive: true,
      ...initialValues,
    },
  })

  useEffect(() => {
    form.reset({
      subCatThreeName: initialValues?.subCatThreeName ?? '',
      isActive: initialValues?.isActive ?? true,
    })
  }, [form, initialValues])

  const createMutation = useMutation({
    mutationFn: async (values: FlavourFormValues) => {
      const payload: AddFlavourPayload = {
        userId: user?.userId ?? 0,
        subCatThreeName: values.subCatThreeName,
        isActive: values.isActive,
      }
      return addFlavour(payload)
    },
    onSuccess: async (_, values) => {
      toast.success('Flavour created successfully')
      queryClient.invalidateQueries({ queryKey: ['flavours'] })
      await onSubmit?.(values)
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to create flavour'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (values: FlavourFormValues) => {
      const payload: UpdateFlavourPayload = {
        id: flavourId ?? 0,
        userId: user?.userId ?? 0,
        subCatThreeName: values.subCatThreeName,
        isActive: values.isActive,
      }
      return editFlavour(payload)
    },
    onSuccess: async (_, values) => {
      toast.success('Flavour updated successfully')
      queryClient.invalidateQueries({ queryKey: ['flavours'] })
      await onSubmit?.(values)
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to update flavour'
      toast.error(message)
    },
  })

  const handleSubmit = async (values: FlavourFormValues) => {
    if (mode === 'create') {
      await createMutation.mutateAsync(values)
    } else if (mode === 'edit' && flavourId != null) {
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
          name='subCatThreeName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Flavour</FormLabel>
              <FormControl>
                <Input placeholder='Flavour Name' {...field} />
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

export default FlavourForm
