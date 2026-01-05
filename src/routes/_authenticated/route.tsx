import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { getAccessToken, getRefreshToken } from '@/services/tokenService'
import { getEffectivePermissions, isPathAllowedForUser } from '@/lib/authz'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    const token = getAccessToken()
    const refresh = getRefreshToken()
    if (!token && !refresh) {
      throw redirect({ to: '/sign-in', search: { redirect: '/' } })
    }

    // Fallback role-based guard for any child route without its own beforeLoad
    const path = location.pathname.replace('/_authenticated', '') || '/'
    const permissions = getEffectivePermissions()
    if (!isPathAllowedForUser(path, permissions)) {
      throw redirect({ to: '/errors/unauthorized', replace: true })
    }
  },
  component: AuthenticatedLayout,
})
