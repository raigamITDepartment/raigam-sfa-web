import { SubRoleId } from '@/lib/authz'

export function defaultLandingFor(
  roleId?: number,
  subRoleId?: number
): string {
  if (roleId === SubRoleId.CCU || subRoleId === SubRoleId.CCU) {
    return '/hr-module/time-attendance'
  }
  return '/dashboard/overview'
}
