import { createFileRoute } from '@tanstack/react-router'
import { MaintenanceError } from '@/features/errors/maintenance-error'

export const Route = createFileRoute('/_authenticated/errors/maintenance-error')({
  component: MaintenanceError,
})

