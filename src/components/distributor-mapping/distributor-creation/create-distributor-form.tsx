'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAppSelector } from '@/store/hooks'
import { createNewDistributor } from '@/services/userDemarcationApi'
import {
  buildDistributorPayload,
  type DistributorFormInitialValues,
  type DistributorFormValues,
  DistributorFormLayout,
  useDistributorFormState,
} from './distributor-form-shared'
import type { RangeDTO } from '@/services/userDemarcationApi'

type CreateDistributorFormProps = {
  initialValues?: DistributorFormInitialValues
  onSuccess?: () => void
  onCancel?: () => void
  ranges?: RangeDTO[]
}

export const CreateDistributorForm = ({
  initialValues,
  onSuccess,
  onCancel,
  ranges,
}: CreateDistributorFormProps) => {
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)
  const { form, ranges: availableRanges } = useDistributorFormState({
    initialValues,
    rangesOverride: ranges,
  })

  const mutation = useMutation({
    mutationFn: async (values: DistributorFormValues) => {
      const payload = buildDistributorPayload(values, user?.userId)
      return createNewDistributor(payload)
    },
    onSuccess: () => {
      toast.success('Distributor created successfully')
      queryClient.invalidateQueries({ queryKey: ['distributors'] })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(
        (error as Error)?.message ?? 'Failed to save distributor details'
      )
    },
  })

  return (
    <DistributorFormLayout
      form={form}
      ranges={availableRanges}
      submitLabel='Create Distributor'
      isPending={mutation.isPending}
      onCancel={onCancel}
      onSubmit={(values) => mutation.mutate(values)}
    />
  )
}
