import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/$rest')({
  beforeLoad: () => {
    throw redirect({ to: '/errors/not-found', replace: true })
  },
})

