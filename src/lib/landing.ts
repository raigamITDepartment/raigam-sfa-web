export function defaultLandingFor(_roleId?: number): string {
  // Authorization disabled: always land on dashboard
  return '/dashboard/overview'
}
