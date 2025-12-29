// Authorization disabled: no redirects, always allow
import { redirect } from '@tanstack/react-router'
import { store } from '@/store'

// Business role IDs as provided by backend
export const RoleId = {
  SystemAdmin: 1,
  TopManager: 2,
  SeniorManagerSales: 3,
  SeniorManagerCompany: 4,
  ManagerSales: 5,
  ManagerCompany: 6,
  ExecutiveSales: 7,
  ExecutiveCompany: 8,
  OperationSales: 11,
  OperationCompany: 12,
} as const

export const SubRoleId = {
  Admin: 1,
  MD: 2,
  GM: 3,
  DGM: 4,
  ChannelHead: 5,
  SubChannelHead: 6,
  RegionSalesManager: 7,
  AreaSalesManager: 8,
  AreaSalesExecutive: 9,
  Representative: 10,
  Agent: 11,
  TNC: 12,
  Sales: 13,
  CCU: 14,
  Finance: 15,
  Brand: 16,
  HR: 17,
  RMS: 18,
  Wayaba: 19,
  InternalAudits: 20,
  AutoMobile: 21,
  RnD: 22,
} as const

export type RoleIdValue = number
type Permission = string

// Central role → route access rules (by path prefix)
// Use the longest matching key for a given path
export const RoleAccess: Record<string, RoleIdValue[]> = {
  // Dashboards
  '/dashboard/home-report': [
    RoleId.SystemAdmin,
    RoleId.TopManager,
    RoleId.ManagerSales,
  ],
  '/dashboard/heart-count': [
    RoleId.SystemAdmin,
    RoleId.TopManager,
    RoleId.ManagerSales,
  ],

  // Master Settings
  '/master-settings/demarcation': [
    RoleId.SystemAdmin,
    RoleId.SeniorManagerSales,
    RoleId.ManagerSales,
    RoleId.ExecutiveSales,
  ],
  '/master-settings/distributor-mapping': [
    RoleId.SystemAdmin,
    RoleId.SeniorManagerSales,
    RoleId.ManagerSales,
    RoleId.ExecutiveSales,
  ],
  '/master-settings/final-geography-mapping': [
    RoleId.SystemAdmin,
    RoleId.SeniorManagerSales,
    RoleId.ManagerSales,
    RoleId.ExecutiveSales,
  ],

  // Sales Details
  '/sales/sales-details/view-item-range-wise': [
    RoleId.SystemAdmin,
    RoleId.ManagerSales,
    RoleId.ExecutiveSales,
  ],
  '/sales/sales-details/stock': [
    RoleId.SystemAdmin,
    RoleId.ManagerSales,
    RoleId.ExecutiveSales,
  ],
  '/sales/sales-details/view-invoices': [
    RoleId.SystemAdmin,
    RoleId.ManagerSales,
    RoleId.ExecutiveSales,
  ],
  '/sales/sales-details/market-return': [
    RoleId.SystemAdmin,
    RoleId.ManagerSales,
    RoleId.ExecutiveSales,
  ],

  // Sales Operations
  '/sales/sales-operations/category-add': [
    RoleId.SystemAdmin,
    RoleId.TopManager,
    RoleId.ManagerSales,
    RoleId.ExecutiveCompany,
  ],
  '/sales/sales-operations/item-master': [
    RoleId.SystemAdmin,
    RoleId.TopManager,
    RoleId.ManagerSales,
    RoleId.ExecutiveCompany,
  ],
  '/sales/sales-operations/item-add': [
    RoleId.SystemAdmin,
    RoleId.TopManager,
    RoleId.ManagerSales,
    RoleId.ExecutiveCompany,
  ],
  '/sales/sales-operations/working-day': [
    RoleId.SystemAdmin,
    RoleId.TopManager,
    RoleId.ManagerSales,
    RoleId.ExecutiveCompany,
  ],
  '/sales/sales-operations/target': [
    RoleId.SystemAdmin,
    RoleId.TopManager,
    RoleId.ManagerSales,
    RoleId.ExecutiveCompany,
  ],
  '/sales/sales-operations/free-issue': [
    RoleId.SystemAdmin,
    RoleId.TopManager,
    RoleId.ManagerSales,
    RoleId.ExecutiveCompany,
  ],

  // Outlet Module
  '/outlet-module/outlets': [RoleId.SystemAdmin, RoleId.ManagerSales],
  '/outlet-module/route': [RoleId.SystemAdmin, RoleId.ManagerSales],

  // Reports
  '/reports/achievement-category-wise': [
    RoleId.SystemAdmin,
    RoleId.TopManager,
    RoleId.ExecutiveCompany,
    RoleId.ManagerSales,
  ],
  '/reports/area-wise-sales-report': [
    RoleId.SystemAdmin,
    RoleId.TopManager,
    RoleId.ExecutiveCompany,
    RoleId.ManagerSales,
  ],
  '/reports/territory-wise-items-report': [
    RoleId.SystemAdmin,
    RoleId.TopManager,
    RoleId.ExecutiveCompany,
    RoleId.ManagerSales,
  ],
  '/reports/territory-wise-sales-report': [
    RoleId.SystemAdmin,
    RoleId.TopManager,
    RoleId.ExecutiveCompany,
    RoleId.ManagerSales,
  ],
  // Present in codebase; align with Reports access model
  '/reports/item-summary-report': [
    RoleId.SystemAdmin,
    RoleId.TopManager,
    RoleId.ExecutiveCompany,
    RoleId.ManagerSales,
  ],

  // HR Module
  '/hr-module/gps-monitoring': [
    RoleId.SystemAdmin,
    RoleId.SeniorManagerSales,
    RoleId.ExecutiveSales,
    RoleId.OperationCompany,
  ],
  '/hr-module/time-attendance': [
    RoleId.SystemAdmin,
    RoleId.SeniorManagerSales,
    RoleId.ExecutiveSales,
    RoleId.OperationCompany,
  ],

  // Admin Module
  '/admin-module/user-module/add-modifiy-user': [RoleId.SystemAdmin],
  '/admin-module/operation/reverse-requests': [RoleId.SystemAdmin],
  '/admin-module/operation/manual-bill-quota': [RoleId.SystemAdmin],

  // Agency Module
  '/agency-module/invoice/invoices-summary': [
    RoleId.SystemAdmin,
    RoleId.OperationSales,
    SubRoleId.AreaSalesManager,
    SubRoleId.AreaSalesExecutive,
  ],
  '/agency-module/invoice/post-invoice': [
    RoleId.SystemAdmin,
    RoleId.OperationSales,
    SubRoleId.AreaSalesManager,
    SubRoleId.AreaSalesExecutive,
  ],
  '/agency-module/invoice/manual-invoice': [
    RoleId.SystemAdmin,
    RoleId.OperationSales,
  ],
  '/agency-module/invoice/view-invoice': [
    RoleId.SystemAdmin,
    RoleId.OperationSales,
    SubRoleId.AreaSalesManager,
    SubRoleId.AreaSalesExecutive,
  ],
  '/agency-module/loading-list/view-loading-list': [
    RoleId.SystemAdmin,
    RoleId.OperationSales,
  ],
  '/agency-module/market-return/return': [
    RoleId.SystemAdmin,
    RoleId.OperationSales,
  ],
  '/agency-module/stock/view-stock': [
    RoleId.SystemAdmin,
    RoleId.TopManager,
    RoleId.SeniorManagerSales,
    RoleId.ManagerSales,
    RoleId.ExecutiveSales,
    RoleId.OperationCompany,
  ],
  '/agency-module/stock/add-stock': [
    RoleId.SystemAdmin,
    RoleId.TopManager,
    RoleId.SeniorManagerSales,
    RoleId.ManagerSales,
    RoleId.ExecutiveSales,
    RoleId.OperationCompany,
  ],
  '/agency-module/stock/request-order': [
    RoleId.SystemAdmin,
    RoleId.TopManager,
    RoleId.SeniorManagerSales,
    RoleId.ManagerSales,
    RoleId.ExecutiveSales,
    RoleId.OperationCompany,
  ],
}

export function getEffectiveRoleId(): number | undefined {
  // Prefer Redux state if already hydrated
  const u = store.getState().auth.user
  if (u?.roleId != null) return u.roleId

  // Fallback: read from localStorage persisted user
  try {
    const raw = localStorage.getItem('auth_user')
    if (raw) {
      const parsed = JSON.parse(raw) as { roleId?: unknown }
      const rid = (parsed?.roleId as number | string | undefined) ?? undefined
      if (typeof rid === 'number') return rid
      if (typeof rid === 'string') {
        const n = Number(rid)
        if (!Number.isNaN(n)) return n
      }
    }
  } catch {
    // ignore
  }
  return undefined
}

export function getEffectiveSubRoleId(): number | undefined {
  const u = store.getState().auth.user
  if (u?.subRoleId != null) return u.subRoleId

  try {
    const raw = localStorage.getItem('auth_user')
    if (raw) {
      const parsed = JSON.parse(raw) as { subRoleId?: unknown }
      const rid = (parsed?.subRoleId as number | string | undefined) ?? undefined
      if (typeof rid === 'number') return rid
      if (typeof rid === 'string') {
        const n = Number(rid)
        if (!Number.isNaN(n)) return n
      }
    }
  } catch {
    // ignore
  }
  return undefined
}

function longestMatchingRule(pathname: string): RoleIdValue[] | undefined {
  const keys = Object.keys(RoleAccess)
  // Sort by length desc to find the most specific match first
  keys.sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (pathname === key || pathname.startsWith(key + '/')) {
      return RoleAccess[key]
    }
  }
  return undefined
}

export function isPathAllowedForRole(
  pathname: string | undefined,
  roleId?: number,
  subRoleId?: number
): boolean {
  if (!pathname) return false
  const allowed = longestMatchingRule(pathname)
  if (!allowed) return true // no rule means allowed
  if (!roleId && !subRoleId) return false
  if (roleId && allowed.includes(roleId)) return true
  if (subRoleId && allowed.includes(subRoleId)) return true
  return false
}

// Simple permission flags, reserved for future use
export function can(_perm: Permission): boolean {
  // If/when backend supplies authority array, wire it here
  return true
}

export async function ensureCan(
  _required: Permission | Permission[]
): Promise<void> {
  // Placeholder for future permission preload
  return
}

// Used by route beforeLoad hooks. Throws a redirect on failure.
export async function ensureRoleAccess(allowed: RoleIdValue[]): Promise<void> {
  if (!allowed || allowed.length === 0) return
  const roleId = getEffectiveRoleId()
  const subRoleId = getEffectiveSubRoleId()
  const hasRole =
    (roleId != null && allowed.includes(roleId)) ||
    (subRoleId != null && allowed.includes(subRoleId))

  if (!hasRole) {
    throw redirect({ to: '/errors/unauthorized', replace: true })
  }
}
