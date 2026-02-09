import { createFileRoute } from '@tanstack/react-router'
import { ForbiddenError } from '@/features/errors/forbidden'

export const Route = createFileRoute('/_authenticated/errors/forbidden')({
  component: ForbiddenError,
})

