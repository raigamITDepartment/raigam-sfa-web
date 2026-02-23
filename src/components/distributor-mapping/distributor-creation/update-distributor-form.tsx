'use client'

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ApiResponse,
  type DistributorDTO,
  type Id,
  type RangeDTO,
  type UpdateDistributorRequest,
  findDistributorById,
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
  const {
    data: distributorDetails,
    isLoading: isDistributorLoading,
    isError: isDistributorDetailsError,
  } = useQuery({
    queryKey: ['distributors', 'detail', distributorId],
    enabled: distributorId !== undefined && distributorId !== null,
    queryFn: async () => {
      const res = (await findDistributorById(distributorId as Id)) as ApiResponse<
        DistributorDTO
      >
      return res.payload
    },
  })

  const resolvedInitialValues = useMemo<DistributorFormInitialValues | undefined>(
    () => {
      if (!initialValues && !distributorDetails) return undefined

      const rangeText = (
        distributorDetails?.range ??
        distributorDetails?.rangeName ??
        initialValues?.range ??
        initialValues?.rangeName ??
        ''
      ).trim()

      return {
        rangeId:
          distributorDetails?.rangeId !== undefined &&
          distributorDetails?.rangeId !== null
            ? String(distributorDetails.rangeId)
            : (initialValues?.rangeId ?? ''),
        range: rangeText,
        rangeName: rangeText,
        distributorName:
          distributorDetails?.distributorName ?? initialValues?.distributorName ?? '',
        email: distributorDetails?.email ?? initialValues?.email ?? '',
        address1: distributorDetails?.address1 ?? initialValues?.address1 ?? '',
        address2: distributorDetails?.address2 ?? initialValues?.address2 ?? '',
        address3: distributorDetails?.address3 ?? initialValues?.address3 ?? '',
        mobileNo: distributorDetails?.mobileNo ?? initialValues?.mobileNo ?? '',
        vatNum: distributorDetails?.vatNum ?? initialValues?.vatNum ?? '',
        isActive: distributorDetails?.isActive ?? initialValues?.isActive ?? true,
      }
    },
    [distributorDetails, initialValues]
  )

  const { form, ranges: availableRanges } = useDistributorFormState({
    initialValues: resolvedInitialValues,
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
      queryClient.invalidateQueries({
        queryKey: ['distributors', 'detail', distributorId],
      })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(
        (error as Error)?.message ?? 'Failed to save distributor details'
      )
    },
  })

  return (
    <>
      {isDistributorDetailsError ? (
        <p className='text-destructive text-sm'>
          Failed to load distributor details. You can still edit with available data.
        </p>
      ) : null}
      <DistributorFormLayout
        form={form}
        ranges={availableRanges}
        submitLabel='Update Distributor'
        submitVariant='default'
        buttonRowClassName='mt-4 flex flex-col gap-2 sm:flex-row'
        isPending={mutation.isPending || isDistributorLoading}
        onCancel={onCancel}
        distributorNameFirst
        onSubmit={(values) => mutation.mutate(values)}
      />
    </>
  )
}
