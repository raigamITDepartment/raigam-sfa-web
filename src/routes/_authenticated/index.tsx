import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: () => {
    const to = '/dashboard/overview'
    throw redirect({ to, replace: true })
  },
})
