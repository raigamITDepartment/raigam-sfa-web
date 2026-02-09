import { createFileRoute } from '@tanstack/react-router'
import { NotFoundError } from '@/features/errors/not-found-error'

export const Route = createFileRoute('/_authenticated/errors/not-found')({
  component: NotFoundError,
})

