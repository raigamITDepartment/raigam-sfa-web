import { createFileRoute } from '@tanstack/react-router'
import { UnauthorisedError } from '@/features/errors/unauthorized-error'

export const Route = createFileRoute('/_authenticated/errors/unauthorized')({
  component: UnauthorisedError,
})

