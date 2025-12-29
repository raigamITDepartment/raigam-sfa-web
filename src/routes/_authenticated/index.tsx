import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  getEffectiveRoleId,
  getEffectiveSubRoleId,
  isPathAllowedForRole,
} from '@/lib/authz'

export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: () => {
    const roleId = getEffectiveRoleId()
    const subRoleId = getEffectiveSubRoleId()
    const canHome = isPathAllowedForRole(
      '/dashboard/home-report',
      roleId,
      subRoleId
    )
    const to = canHome ? '/dashboard/home-report' : '/dashboard/overview'
    throw redirect({ to, replace: true })
  },
})
