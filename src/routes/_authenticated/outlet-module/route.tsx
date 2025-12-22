import { Outlet, createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'

export const Route = createFileRoute('/_authenticated/outlet-module')({
  beforeLoad: () =>
    ensureRoleAccess([
      RoleId.SystemAdmin,
      RoleId.SeniorManagerSales,
      RoleId.ExecutiveSales,
    ]),
  component: Outlet,
})
