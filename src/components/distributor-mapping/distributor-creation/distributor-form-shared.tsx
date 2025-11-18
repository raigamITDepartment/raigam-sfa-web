'use client'

import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import {
  type ApiResponse,
  type CreateDistributorRequest,
  type Id,
  type RangeDTO,
  getAllRange,
} from '@/services/userDemarcationApi'
import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'

export const distributorFormSchema = z.object({
  rangeId: z.string().min(1, 'Please select a range'),
  distributorName: z.string().trim().min(1, 'Please enter distributor name'),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      'Please enter a valid email address'
    ),
  address1: z.string().trim().optional(),
  address2: z.string().trim().optional(),
  address3: z.string().trim().optional(),
  mobileNo: z.string().trim().min(1, 'Please enter a mobile number'),
  vatNum: z.string().trim().optional(),
  isActive: z.boolean(),
})

export type DistributorFormValues = z.output<typeof distributorFormSchema>
export type DistributorFormInitialValues = Partial<
  DistributorFormValues & { range?: string; rangeName?: string }
>

export const distributorFormDefaultValues: DistributorFormValues = {
  rangeId: '',
  distributorName: '',
  email: '',
  address1: '',
  address2: '',
  address3: '',
  mobileNo: '',
  vatNum: '',
  isActive: true,
}

type UseDistributorFormStateOptions = {
  initialValues?: DistributorFormInitialValues
  rangesOverride?: RangeDTO[]
}

export const useDistributorFormState = ({
  initialValues,
  rangesOverride,
}: UseDistributorFormStateOptions = {}) => {
  const rangesQuery = useQuery({
    queryKey: ['user-demarcation', 'ranges'],
    queryFn: async () => {
      const res = (await getAllRange()) as ApiResponse<RangeDTO[]>
      return res.payload
    },
    enabled: !rangesOverride,
  })

  const form = useForm<DistributorFormValues>({
    resolver: zodResolver(distributorFormSchema),
    defaultValues: distributorFormDefaultValues,
  })

  const ranges = useMemo(() => {
    const base = rangesOverride ?? rangesQuery.data ?? []
    if (!initialValues?.rangeId) return base
    const normalizedId = String(initialValues.rangeId)
    const hasRange = base.some((range) => {
      const optionId = range.id ?? range.rangeId
      if (optionId === undefined || optionId === null) return false
      return String(optionId) === normalizedId
    })
    if (hasRange) return base
    const fallbackLabel =
      initialValues.rangeName ??
      initialValues.range ??
      `Range ${normalizedId}`
    return [
      {
        id: initialValues.rangeId,
        rangeName: fallbackLabel,
      } satisfies RangeDTO,
      ...base,
    ]
  }, [
    initialValues?.range,
    initialValues?.rangeId,
    initialValues?.rangeName,
    rangesOverride,
    rangesQuery.data,
  ])

  useEffect(() => {
    form.reset({
      ...distributorFormDefaultValues,
      ...initialValues,
      rangeId: initialValues?.rangeId
        ? String(initialValues.rangeId)
        : distributorFormDefaultValues.rangeId,
    })
  }, [initialValues, form])

  useEffect(() => {
    if (!initialValues?.rangeId) return
    const currentValue = form.getValues('rangeId')
    const normalized = String(initialValues.rangeId)
    if (currentValue === normalized) return
    form.setValue('rangeId', normalized)
  }, [initialValues?.rangeId, form])

  useEffect(() => {
    if (initialValues?.rangeId) return
    const targetName =
      initialValues?.rangeName?.trim() ?? initialValues?.range?.trim()
    if (!targetName) return
    if (!ranges.length) return
    if (form.getValues('rangeId')) return

    const matchedRange = ranges.find(
      (range) =>
        range.rangeName?.trim().toLowerCase() === targetName.toLowerCase()
    )
    if (!matchedRange) return
    form.setValue('rangeId', String(matchedRange.id ?? ''))
  }, [
    form,
    initialValues?.rangeId,
    initialValues?.rangeName,
    initialValues?.range,
    ranges,
  ])

  return {
    form,
    ranges,
  }
}

export type DistributorFormLayoutProps = {
  form: UseFormReturn<DistributorFormValues>
  ranges: RangeDTO[]
  onSubmit: (values: DistributorFormValues) => void
  onCancel?: () => void
  submitLabel: string
  isPending?: boolean
  distributorNameFirst?: boolean
}

export const DistributorFormLayout = ({
  form,
  ranges,
  onSubmit,
  onCancel,
  submitLabel,
  isPending = false,
  distributorNameFirst = false,
}: DistributorFormLayoutProps) => {
  const rangeField = (
    <FormField
      control={form.control}
      name='rangeId'
      render={({ field }) => (
        <FormItem className='sm:col-span-2'>
          <FormLabel>Range</FormLabel>
          <FormControl>
            <Select
              value={field.value}
              onValueChange={(value) => field.onChange(value)}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select range' />
              </SelectTrigger>
              <SelectContent>
                {ranges.map((range, index) => {
                  const optionId = range.id ?? range.rangeId
                  if (optionId === undefined || optionId === null) return null
                  const optionLabel =
                    range.rangeName ?? `Range ${optionId}`
                  return (
                    <SelectItem
                      key={`${optionId}-${index}`}
                      value={String(optionId)}
                    >
                      {optionLabel}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const distributorNameField = (
    <FormField
      control={form.control}
      name='distributorName'
      render={({ field }) => (
        <FormItem className='sm:col-span-2'>
          <FormLabel>Distributor Name</FormLabel>
          <FormControl>
            <Input placeholder='Distributor Name' {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Form {...form}>
      <form
        className='grid gap-4'
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <div className='grid gap-4 sm:grid-cols-2'>
          {distributorNameFirst ? (
            <>
              {distributorNameField}
              {rangeField}
            </>
          ) : (
            <>
              {rangeField}
              {distributorNameField}
            </>
          )}
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem className='sm:col-span-2'>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder='Email address' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='address1'
            render={({ field }) => (
              <FormItem className='sm:col-span-2'>
                <FormLabel>Address Line 1</FormLabel>
                <FormControl>
                  <Input placeholder='Address line 1' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='address2'
            render={({ field }) => (
              <FormItem className='sm:col-span-2'>
                <FormLabel>Address Line 2</FormLabel>
                <FormControl>
                  <Input placeholder='Address line 2' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='address3'
            render={({ field }) => (
              <FormItem className='sm:col-span-2'>
                <FormLabel>Address Line 3</FormLabel>
                <FormControl>
                  <Input placeholder='Address line 3' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='mobileNo'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Mobile number'
                    inputMode='tel'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='vatNum'
            render={({ field }) => (
              <FormItem>
                <FormLabel>VAT Number</FormLabel>
                <FormControl>
                  <Input placeholder='VAT number' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='isActive'
            render={({ field }) => (
              <FormItem className='flex items-center gap-3 sm:col-span-2'>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(value) => field.onChange(value)}
                  />
                </FormControl>
                <FormLabel className='m-0'>Is Active</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className='mt-6 flex flex-col gap-2 sm:flex-row'>
          <Button
            type='submit'
            className='w-full sm:flex-1'
            disabled={isPending}
          >
            {submitLabel}
          </Button>
          <Button
            type='button'
            variant='outline'
            className='w-full sm:flex-1'
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}

export const buildDistributorPayload = (
  values: DistributorFormValues,
  userId?: Id
): CreateDistributorRequest => {
  return {
    rangeId: Number(values.rangeId),
    userId,
    distributorName: values.distributorName.trim(),
    email: values.email ? values.email.trim() : undefined,
    address1: values.address1 ? values.address1.trim() : undefined,
    address2: values.address2 ? values.address2.trim() : undefined,
    address3: values.address3 ? values.address3.trim() : undefined,
    mobileNo: values.mobileNo.trim(),
    vatNum: values.vatNum ? values.vatNum.trim() : undefined,
    isActive: values.isActive,
  }
}
