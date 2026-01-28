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

export const PermissionKey = {
  DashboardOverview: 'dashboard.overview',
  DashboardHomeReport: 'dashboard.homeReport',
  DashboardHeartCount: 'dashboard.heartCount',
  MasterSettingsDemarcation: 'masterSettings.demarcation',
  MasterSettingsDistributorMapping: 'masterSettings.distributorMapping',
  MasterSettingsFinalGeographyMapping: 'masterSettings.finalGeographyMapping',
  SalesDetailsViewAllItems: 'sales.details.viewAllItems',
  SalesDetailsStock: 'sales.details.stock',
  SalesDetailsViewInvoices: 'sales.details.viewInvoices',
  SalesDetailsMarketReturn: 'sales.details.marketReturn',
  SalesOperationsManageCategory: 'sales.operations.manageCategory',
  SalesOperationsItemMaster: 'sales.operations.itemMaster',
  SalesOperationsItemAdd: 'sales.operations.itemAdd',
  SalesOperationsWorkingDay: 'sales.operations.workingDay',
  SalesOperationsTarget: 'sales.operations.target',
  SalesOperationsFreeIssue: 'sales.operations.freeIssue',
  OutletModuleOutlets: 'outletModule.outlets',
  OutletModuleRoutes: 'outletModule.routes',
  ReportsAchievementCategoryWise: 'reports.achievementCategoryWise',
  ReportsAreaWiseSales: 'reports.areaWiseSales',
  ReportsTerritoryWiseSales: 'reports.territoryWiseSales',
  ReportsTerritoryWiseItems: 'reports.territoryWiseItems',
  ReportsItemSummary: 'reports.itemSummary',
  HrGpsMonitoring: 'hr.gpsMonitoring',
  HrTimeAttendance: 'hr.timeAttendance',
  AdminUserAddModify: 'admin.user.addModify',
  AdminUserManagePermissions: 'admin.user.managePermissions',
  AdminOperationManualBillQuota: 'admin.operation.manualBillQuota',
  AgencyInvoiceView: 'agency.invoice.view',
  AgencyInvoiceManual: 'agency.invoice.manual',
  AgencyInvoiceSummary: 'agency.invoice.summary',
  AgencyInvoicePost: 'agency.invoice.post',
  AgencyLoadingListView: 'agency.loadingList.view',
  AgencyMarketReturn: 'agency.marketReturn',
  AgencyStockView: 'agency.stock.view',
  AgencyStockAdd: 'agency.stock.add',
  AgencyStockRequestOrder: 'agency.stock.requestOrder',
} as const

export type PermissionKey =
  | (typeof PermissionKey)[keyof typeof PermissionKey]
  | (string & {})

// Route permissions (by path prefix). Use the longest matching key for a path.
export const RoutePermissions: Record<
  string,
  PermissionKey | PermissionKey[]
> = {
  // Dashboards
  '/dashboard/overview': PermissionKey.DashboardOverview,
  '/dashboard/home-report': PermissionKey.DashboardHomeReport,
  '/dashboard/heart-count': PermissionKey.DashboardHeartCount,

  // Master Settings
  '/master-settings/demarcation': PermissionKey.MasterSettingsDemarcation,
  '/master-settings/distributor-mapping':
    PermissionKey.MasterSettingsDistributorMapping,
  '/master-settings/final-geography-mapping':
    PermissionKey.MasterSettingsFinalGeographyMapping,

  // Sales Details
  '/sales/sales-details/view-all-items':
    PermissionKey.SalesDetailsViewAllItems,
  '/sales/sales-details/stock': PermissionKey.SalesDetailsStock,
  '/sales/sales-details/view-invoices': PermissionKey.SalesDetailsViewInvoices,
  '/sales/sales-details/market-return':
    PermissionKey.SalesDetailsMarketReturn,

  // Sales Operations
  '/sales/sales-operations/manage-category':
    PermissionKey.SalesOperationsManageCategory,
  '/sales/sales-operations/item-master':
    PermissionKey.SalesOperationsItemMaster,
  '/sales/sales-operations/item-add': PermissionKey.SalesOperationsItemAdd,
  '/sales/sales-operations/working-day':
    PermissionKey.SalesOperationsWorkingDay,
  '/sales/sales-operations/target': PermissionKey.SalesOperationsTarget,
  '/sales/sales-operations/free-issue': PermissionKey.SalesOperationsFreeIssue,

  // Outlet Module
  '/outlet-module/outlets': PermissionKey.OutletModuleOutlets,

  // Reports
  '/reports/achievement-category-wise':
    PermissionKey.ReportsAchievementCategoryWise,
  '/reports/area-wise-sales-report': PermissionKey.ReportsAreaWiseSales,
  '/reports/territory-wise-sales-report':
    PermissionKey.ReportsTerritoryWiseSales,
  '/reports/territory-wise-items-report':
    PermissionKey.ReportsTerritoryWiseItems,
  '/reports/item-summary-report': PermissionKey.ReportsItemSummary,

  // HR Module
  '/hr-module/gps-monitoring': PermissionKey.HrGpsMonitoring,
  '/hr-module/time-attendance': PermissionKey.HrTimeAttendance,

  // Admin Module
  '/admin-module/user-module/add-modify-user':
    PermissionKey.AdminUserAddModify,
  '/admin-module/user-module/manage-permission':
    PermissionKey.AdminUserManagePermissions,
  '/admin-module/operation/manual-bill-quota':
    PermissionKey.AdminOperationManualBillQuota,

  // Agency Module
  '/agency-module/invoice/invoices-summary':
    PermissionKey.AgencyInvoiceSummary,
  '/agency-module/invoice/post-invoice': PermissionKey.AgencyInvoicePost,
  '/agency-module/invoice/manual-invoice': PermissionKey.AgencyInvoiceManual,
  '/agency-module/invoice/view-invoice': PermissionKey.AgencyInvoiceView,
  '/agency-module/loading-list/view-loading-list':
    PermissionKey.AgencyLoadingListView,
  '/agency-module/market-return/return': PermissionKey.AgencyMarketReturn,
  '/agency-module/stock/view-stock': PermissionKey.AgencyStockView,
  '/agency-module/stock/add-stock': PermissionKey.AgencyStockAdd,
  '/agency-module/stock/request-order':
    PermissionKey.AgencyStockRequestOrder,
}

// Central role-to-route access rules (by path prefix).
// Use the longest matching key for a given path.
export const RoleAccess: Record<string, RoleIdValue[]> = {
  // Dashboards
  '/dashboard/overview': [
    RoleId.SystemAdmin,
    RoleId.TopManager,
    RoleId.ManagerSales,
  ],
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
  '/sales/sales-details/view-all-items': [
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
  '/sales/sales-operations/manage-category': [
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
  '/outlet-module/outlets': [
    RoleId.SystemAdmin,
    RoleId.ManagerSales,
    SubRoleId.Representative,
  ],

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
    RoleId.ManagerSales,
    RoleId.ExecutiveSales,
    RoleId.ExecutiveCompany,
    RoleId.OperationCompany,
    SubRoleId.AreaSalesManager,
    SubRoleId.RegionSalesManager,
    SubRoleId.CCU,
  ],

  // Admin Module
  '/admin-module/user-module/add-modify-user': [RoleId.SystemAdmin],
  '/admin-module/user-module/manage-permission': [RoleId.SystemAdmin],
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
  if (u?.userGroupId != null) return u.userGroupId
  if (u?.subRoleId != null && u?.roleId != null) return u.roleId

  // Fallback: read from localStorage persisted user
  try {
    const raw = localStorage.getItem('auth_user')
    if (raw) {
      const parsed = JSON.parse(raw) as {
        userGroupId?: unknown
        roleId?: unknown
        subRoleId?: unknown
      }
      const rid =
        (parsed?.userGroupId as number | string | undefined) ??
        (parsed?.subRoleId != null
          ? (parsed?.roleId as number | string | undefined)
          : undefined) ??
        undefined
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
  if (u?.roleId != null) return u.roleId
  if (u?.subRoleId != null) return u.subRoleId

  try {
    const raw = localStorage.getItem('auth_user')
    if (raw) {
      const parsed = JSON.parse(raw) as {
        userGroupId?: unknown
        roleId?: unknown
        subRoleId?: unknown
      }
      const rid =
        (parsed?.userGroupId != null
          ? (parsed?.roleId as number | string | undefined) ??
            (parsed?.subRoleId as number | string | undefined)
          : (parsed?.subRoleId as number | string | undefined)) ?? undefined
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

function normalizePathname(pathname: string): string {
  if (!pathname) return '/'
  if (pathname.startsWith('/_authenticated')) {
    const stripped = pathname.slice('/_authenticated'.length)
    return stripped || '/'
  }
  return pathname
}

function longestMatchingRule<T>(
  pathname: string,
  rules: Record<string, T>
): T | undefined {
  const normalized = normalizePathname(pathname)
  const keys = Object.keys(rules)
  // Sort by length desc to find the most specific match first
  keys.sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (normalized === key || normalized.startsWith(key + '/')) {
      return rules[key]
    }
  }
  return undefined
}

function getRoleRuleForPath(pathname: string): RoleIdValue[] | undefined {
  return longestMatchingRule(pathname, RoleAccess)
}

export function getRequiredPermissionsForPath(
  pathname: string | undefined
): PermissionKey[] | undefined {
  if (!pathname) return undefined
  const required = longestMatchingRule(pathname, RoutePermissions)
  if (!required) return undefined
  return Array.isArray(required) ? required : [required]
}

function normalizePermissions(
  permissions: PermissionKey | PermissionKey[]
): PermissionKey[] {
  return Array.isArray(permissions) ? permissions : [permissions]
}

function derivePermissionsFromRole(
  roleId?: number,
  subRoleId?: number
): PermissionKey[] {
  if (roleId == null && subRoleId == null) return []
  const derived = new Set<PermissionKey>()
  for (const [path, required] of Object.entries(RoutePermissions)) {
    const allowed = getRoleRuleForPath(path)
    if (!allowed) continue
    const hasRole =
      (roleId != null && allowed.includes(roleId)) ||
      (subRoleId != null && allowed.includes(subRoleId))
    if (!hasRole) continue
    for (const perm of normalizePermissions(required)) {
      derived.add(perm)
    }
  }
  return Array.from(derived)
}

function getStoredPermissions(): PermissionKey[] | undefined {
  try {
    const raw = localStorage.getItem('auth_user')
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { permissions?: unknown }
    const perms = parsed?.permissions
    if (Array.isArray(perms)) return perms as PermissionKey[]
  } catch {
    // ignore
  }
  return undefined
}

export function resolvePermissions({
  permissions,
  roleId,
  subRoleId,
}: {
  permissions?: PermissionKey[] | null
  roleId?: number
  subRoleId?: number
}): PermissionKey[] {
  // Prefer backend permissions; fall back to role-derived permissions when missing.
  if (Array.isArray(permissions)) return permissions
  return derivePermissionsFromRole(roleId, subRoleId)
}

export function getEffectivePermissions(): PermissionKey[] {
  const user = store.getState().auth.user
  const statePermissions = Array.isArray(user?.permissions)
    ? user.permissions
    : undefined
  const storedPermissions =
    statePermissions === undefined ? getStoredPermissions() : undefined
  const roleId = getEffectiveRoleId()
  const subRoleId = getEffectiveSubRoleId()
  return resolvePermissions({
    permissions: statePermissions ?? storedPermissions,
    roleId,
    subRoleId,
  })
}

export function hasAnyPermission(
  permissions: PermissionKey[],
  required: PermissionKey | PermissionKey[]
): boolean {
  if (!permissions.length) return false
  const requiredList = normalizePermissions(required)
  return requiredList.some((perm) => permissions.includes(perm))
}

export function isPathAllowedForRole(
  pathname: string | undefined,
  roleId?: number,
  subRoleId?: number
): boolean {
  if (!pathname) return false
  const allowed = getRoleRuleForPath(pathname)
  if (!allowed) return true // no rule means allowed
  if (!roleId && !subRoleId) return false
  if (roleId && allowed.includes(roleId)) return true
  if (subRoleId && allowed.includes(subRoleId)) return true
  return false
}

export function isPathAllowedForUser(
  pathname: string | undefined,
  permissions?: PermissionKey[] | null,
  roleId?: number,
  subRoleId?: number
): boolean {
  if (!pathname) return false
  const effectiveRoleId = roleId ?? getEffectiveRoleId()
  const effectiveSubRoleId = subRoleId ?? getEffectiveSubRoleId()
  if (pathname.startsWith('/reports') && effectiveRoleId === RoleId.OperationSales) {
    return false
  }
  const required = getRequiredPermissionsForPath(pathname)
  if (!required) return true
  const effective = resolvePermissions({
    permissions,
    roleId: effectiveRoleId,
    subRoleId: effectiveSubRoleId,
  })
  return hasAnyPermission(effective, required)
}

export function can(required: PermissionKey | PermissionKey[]): boolean {
  return hasAnyPermission(getEffectivePermissions(), required)
}

export async function ensureCan(
  required: PermissionKey | PermissionKey[]
): Promise<void> {
  if (!can(required)) {
    throw redirect({ to: '/errors/unauthorized', replace: true })
  }
}

function getCurrentPathname(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return window.location?.pathname
}

// Used by route beforeLoad hooks. Throws a redirect on failure.
export async function ensureRoleAccess(
  allowed: RoleIdValue[],
  pathname?: string
): Promise<void> {
  const effectivePath = pathname ?? getCurrentPathname()
  const required = getRequiredPermissionsForPath(effectivePath)
  if (required) {
    const effective = getEffectivePermissions()
    if (!hasAnyPermission(effective, required)) {
      throw redirect({ to: '/errors/unauthorized', replace: true })
    }
    return
  }

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
