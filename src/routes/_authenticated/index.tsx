import { createFileRoute, redirect } from '@tanstack/react-router'
import { defaultLandingFor } from '@/lib/landing'
import { getEffectiveRoleId, getEffectiveSubRoleId } from '@/lib/authz'

export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: () => {
    const to = defaultLandingFor(
      getEffectiveRoleId(),
      getEffectiveSubRoleId()
    )
    throw redirect({ to, replace: true })
  },
})
