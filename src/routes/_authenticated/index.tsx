import { createFileRoute, redirect } from '@tanstack/react-router'
import { getEffectiveRoleId, isPathAllowedForRole } from '@/lib/authz'

export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: () => {
    const roleId = getEffectiveRoleId()
    const canHome = isPathAllowedForRole('/dashboard/home-report', roleId)
    const to = canHome ? '/dashboard/home-report' : '/dashboard/overview'
    throw redirect({ to, replace: true })
  },
})
