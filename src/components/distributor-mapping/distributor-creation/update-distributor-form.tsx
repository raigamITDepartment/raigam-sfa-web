'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type Id,
  type RangeDTO,
  type UpdateDistributorRequest,
  updateDistributor,
} from '@/services/userDemarcationApi'
import { useAppSelector } from '@/store/hooks'
import { toast } from 'sonner'
import {
  buildDistributorPayload,
  type DistributorFormInitialValues,
  type DistributorFormValues,
  DistributorFormLayout,
  useDistributorFormState,
} from './distributor-form-shared'

type UpdateDistributorFormProps = {
  distributorId?: Id
  initialValues?: DistributorFormInitialValues
  onSuccess?: () => void
  onCancel?: () => void
  ranges?: RangeDTO[]
}

export const UpdateDistributorForm = ({
  distributorId,
  initialValues,
  onSuccess,
  onCancel,
  ranges,
}: UpdateDistributorFormProps) => {
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)
  const { form, ranges: availableRanges } = useDistributorFormState({
    initialValues,
    rangesOverride: ranges,
  })

  const mutation = useMutation({
    mutationFn: async (values: DistributorFormValues) => {
      if (!distributorId) {
        throw new Error('Distributor id is required for update')
      }
      const payload: UpdateDistributorRequest = {
        ...buildDistributorPayload(values, user?.userId),
        id: distributorId,
      }
      return updateDistributor(payload)
    },
    onSuccess: () => {
      toast.success('Distributor updated successfully')
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
      submitLabel='Update Distributor'
      submitVariant='default'
      buttonRowClassName='mt-4 flex flex-col gap-2 sm:flex-row'
      isPending={mutation.isPending}
      onCancel={onCancel}
      distributorNameFirst
      onSubmit={(values) => mutation.mutate(values)}
    />
  )
}
