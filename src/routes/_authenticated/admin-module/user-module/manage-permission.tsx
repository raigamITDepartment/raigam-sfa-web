import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getAllUsers } from '@/services/users/userApi'
import type { UserDemarcationUser } from '@/types/users'
import {
  ChevronDown,
  CheckCircle2,
  Filter,
  Info,
  Shield,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { ensureRoleAccess, RoleId, SubRoleId } from '@/lib/authz'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

type UserStatus = 'Active' | 'Inactive' | 'Suspended'
type PermissionType = 'ROUTE' | 'ACTION'

type PermissionItem = {
  code: string
  title: string
  description: string
  path?: string
  type: PermissionType
}

type PermissionSection = {
  id: string
  title: string
  items: PermissionItem[]
}

type PermissionModule = {
  id: string
  title: string
  description: string
  sections: PermissionSection[]
}

type Group = {
  id: string
  name: string
  description: string
  tags: string[]
}

type Role = {
  id: string
  name: string
  groupId: string
  description: string
}

type UserProfile = {
  id: string
  name: string
  email: string
  groupId: string
  roleIds: string[]
  status: UserStatus
  title: string
  lastActive: string
  location: string
}

type PermissionOverride = {
  allow: string[]
  deny: string[]
}

const roleIdToGroupId: Record<number, string> = {
  [RoleId.SystemAdmin]: 'SYSTEM_ADMIN',
  [RoleId.TopManager]: 'TOP_MANAGEMENT',
  [RoleId.SeniorManagerSales]: 'SENIOR_MANAGER_SALES',
  [RoleId.SeniorManagerCompany]: 'SENIOR_MANAGER_COMPANY',
  [RoleId.ManagerSales]: 'MANAGER_SALES',
  [RoleId.ManagerCompany]: 'MANAGER_COMPANY',
  [RoleId.ExecutiveSales]: 'EXECUTIVE_SALES',
  [RoleId.ExecutiveCompany]: 'EXECUTIVE_COMPANY',
  [RoleId.OperationSales]: 'OPERATION_SALES',
  [RoleId.OperationCompany]: 'OPERATION_COMPANY',
}

const subRoleIdToRoleId: Record<number, string> = {
  [SubRoleId.Admin]: 'ADMIN',
  [SubRoleId.MD]: 'MD',
  [SubRoleId.DGM]: 'DGM',
  [SubRoleId.GM]: 'GM',
  [SubRoleId.ChannelHead]: 'CHANNEL_HEAD',
  [SubRoleId.SubChannelHead]: 'SUB_CHANNEL_HEAD',
  [SubRoleId.RegionSalesManager]: 'REGIONAL_SALES_MANAGER',
  [SubRoleId.AreaSalesManager]: 'AREA_SALES_MANAGER',
  [SubRoleId.AreaSalesExecutive]: 'AREA_SALES_EXECUTIVE',
  [SubRoleId.Representative]: 'REP',
  [SubRoleId.Agent]: 'AGENT',
  [SubRoleId.CCU]: 'CCU',
  [SubRoleId.Finance]: 'FINANCE',
  [SubRoleId.InternalAudits]: 'INTERNAL_AUDIT',
  [SubRoleId.Brand]: 'BRAND',
}

const formatDisplayName = (user: UserDemarcationUser) => {
  const name = [user.firstName, user.lastName]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ')
  return name || user.userName || `User ${user.id}`
}

const formatOptionalDate = (value: string | null) =>
  value && value.trim() ? value : '-'

const permissionModules: PermissionModule[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Executive visibility and KPI monitoring.',
    sections: [
      {
        id: 'dashboard-core',
        title: 'Core Dashboards',
        items: [
          {
            code: 'ROUTE_DASHBOARD_OVERVIEW',
            title: 'Overview',
            description: 'Role-based KPI overview with live highlights.',
            path: '/dashboard/overview',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_DASHBOARD_HOME_REPORT',
            title: 'Home Report',
            description: 'Daily summary with sales and outlet insights.',
            path: '/dashboard/home-report',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_DASHBOARD_HEART_COUNT',
            title: 'Heart Count',
            description: 'Pulse view for operational health.',
            path: '/dashboard/heart-count',
            type: 'ROUTE',
          },
        ],
      },
    ],
  },
  {
    id: 'master-settings',
    title: 'Master Settings',
    description: 'Reference data and structural configuration.',
    sections: [
      {
        id: 'master-core',
        title: 'Demarcation & Mapping',
        items: [
          {
            code: 'ROUTE_MASTER_DEMARCATION',
            title: 'Demarcation',
            description: 'Channel, region, area, and route definitions.',
            path: '/master-settings/demarcation',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_MASTER_DISTRIBUTOR_MAPPING',
            title: 'Distributor Mapping',
            description: 'Distributor creation and agency mapping.',
            path: '/master-settings/distributor-mapping',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_MASTER_FINAL_GEOGRAPHY',
            title: 'Final Geography Mapping',
            description: 'Finalize geography structure and mappings.',
            path: '/master-settings/final-geography-mapping',
            type: 'ROUTE',
          },
        ],
      },
    ],
  },
  {
    id: 'sales',
    title: 'Sales',
    description: 'Sales operations, catalog, and performance detail.',
    sections: [
      {
        id: 'sales-operations',
        title: 'Sales Operations',
        items: [
          {
            code: 'ROUTE_SALES_MANAGE_CATEGORY',
            title: 'Manage Category',
            description: 'Category hierarchy management.',
            path: '/sales/sales-operations/manage-category',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_SALES_ITEM_MASTER',
            title: 'Item Master',
            description: 'Catalog and SKU lifecycle control.',
            path: '/sales/sales-operations/item-master',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_SALES_ITEM_ADD',
            title: 'Item Add',
            description: 'Add new items and variants.',
            path: '/sales/sales-operations/item-add',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_SALES_WORKING_DAY',
            title: 'Working Day',
            description: 'Working day operations and tracking.',
            path: '/sales/sales-operations/working-day',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_SALES_TARGET',
            title: 'Target',
            description: 'Target assignment and monitoring.',
            path: '/sales/sales-operations/target',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_SALES_FREE_ISSUE',
            title: 'Free Issue Mapping',
            description: 'Promotion and free-issue allocation.',
            path: '/sales/sales-operations/free-issue',
            type: 'ROUTE',
          },
          {
            code: 'ACTION_SALES_MANUAL_BILL_QUOTA',
            title: 'Manual Bill Quota',
            description: 'Approve manual bill quota actions.',
            type: 'ACTION',
          },
        ],
      },
      {
        id: 'sales-details',
        title: 'Sales Details',
        items: [
          {
            code: 'ROUTE_SALES_VIEW_ALL_ITEMS',
            title: 'View All Items',
            description: 'Item-level performance insights.',
            path: '/sales/sales-details/view-all-items',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_SALES_STOCK',
            title: 'Stock',
            description: 'Stock availability and balances.',
            path: '/sales/sales-details/stock',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_SALES_VIEW_INVOICES',
            title: 'View Invoices',
            description: 'Invoice history and details.',
            path: '/sales/sales-details/view-invoices',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_SALES_MARKET_RETURN',
            title: 'Market Return',
            description: 'Returns and deductions overview.',
            path: '/sales/sales-details/market-return',
            type: 'ROUTE',
          },
        ],
      },
    ],
  },
  {
    id: 'outlet',
    title: 'Outlet Module',
    description: 'Outlet coverage and route planning.',
    sections: [
      {
        id: 'outlet-core',
        title: 'Outlet Management',
        items: [
          {
            code: 'ROUTE_OUTLET_OUTLETS',
            title: 'Outlets',
            description: 'Outlet master and detail management.',
            path: '/outlet-module/outlets',
            type: 'ROUTE',
          },
        ],
      },
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    description: 'Performance reporting and analytics.',
    sections: [
      {
        id: 'reports-core',
        title: 'Performance Reports',
        items: [
          {
            code: 'ROUTE_REPORT_ACHIEVEMENT_CATEGORY_WISE',
            title: 'Achievement Category Wise',
            description: 'Category-based achievement insights.',
            path: '/reports/achievement-category-wise',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_REPORT_AREA_WISE_SALES',
            title: 'Area Wise Sales Report',
            description: 'Area-level sales performance.',
            path: '/reports/area-wise-sales-report',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_REPORT_TERRITORY_WISE_SALES',
            title: 'Territory Wise Sales Report',
            description: 'Invoices summary by territory.',
            path: '/reports/territory-wise-sales-report',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_REPORT_TERRITORY_WISE_ITEMS',
            title: 'Territory Wise Items Report',
            description: 'Item-level performance by territory.',
            path: '/reports/territory-wise-items-report',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_REPORT_TERRITORY_WISE_INVOICE_SUMMARY',
            title: 'Territory Wise Invoice Summary',
            description: 'Invoice summary by territory.',
            path: '/reports/invoice-reports/territory-wise-invoice-summary',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_REPORT_AREA_WISE_INVOICE_SUMMARY',
            title: 'Area Wise Invoice Summary',
            description: 'Invoice summary by area.',
            path: '/reports/invoice-reports/area-wise-invoice-summary',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_REPORT_OUTLET_NOT_VISITED',
            title: 'Not Visited Outlet Report',
            description: 'Outlets that were not visited in the selected period.',
            path: '/reports/outlet-reports/not-visited-outlet-report',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_REPORT_OUTLET_SALE_SUMMARY',
            title: 'Outlet Sale Summary Report',
            description: 'Outlet-level sales summary report.',
            path: '/reports/outlet-reports/outlet-sale-summary-report',
            type: 'ROUTE',
          },
        ],
      },
    ],
  },
  {
    id: 'hr',
    title: 'HR Module',
    description: 'Attendance and field force monitoring.',
    sections: [
      {
        id: 'hr-core',
        title: 'Monitoring & Attendance',
        items: [
          {
            code: 'ROUTE_HR_GPS_MONITORING',
            title: 'GPS Monitoring',
            description: 'Live GPS tracking for field teams.',
            path: '/hr-module/gps-monitoring',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_HR_TIME_ATTENDANCE',
            title: 'Time Attendance',
            description: 'Attendance and time tracking.',
            path: '/hr-module/time-attendance',
            type: 'ROUTE',
          },
        ],
      },
    ],
  },
  {
    id: 'admin',
    title: 'Admin Module',
    description: 'Governance, access, and operations control.',
    sections: [
      {
        id: 'admin-core',
        title: 'User & Operations',
        items: [
          {
            code: 'ROUTE_ADMIN_ADD_MODIFY_USER',
            title: 'Add/Modify User',
            description: 'Create and manage user profiles.',
            path: '/admin-module/user-module/add-modify-user',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_ADMIN_MANAGE_PERMISSIONS',
            title: 'Manage User Permissions',
            description: 'Assign and audit permissions.',
            path: '/admin-module/user-module/manage-permission',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_ADMIN_MANUAL_BILL_QUOTA',
            title: 'Manual Bill Quota',
            description: 'Manual bill quota operations.',
            path: '/admin-module/operation/manual-bill-quota',
            type: 'ROUTE',
          },
          {
            code: 'ACTION_ADMIN_USER_EXPORT',
            title: 'Export User Audit',
            description: 'Export audit trail for user access.',
            type: 'ACTION',
          },
        ],
      },
    ],
  },
  {
    id: 'agency',
    title: 'Agency Module',
    description: 'Invoices, loading, returns, and stock.',
    sections: [
      {
        id: 'agency-invoice',
        title: 'Invoice',
        items: [
          {
            code: 'ROUTE_AGENCY_INVOICE_VIEW',
            title: 'View Invoice',
            description: 'Booking invoice visibility.',
            path: '/agency-module/invoice/view-invoice',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_AGENCY_INVOICE_MANUAL',
            title: 'Manual Invoice',
            description: 'Manual invoice processing.',
            path: '/agency-module/invoice/manual-invoice',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_AGENCY_INVOICE_SUMMARY',
            title: 'Invoices Summary',
            description: 'Summary of invoice totals.',
            path: '/agency-module/invoice/invoices-summary',
            type: 'ROUTE',
          },
          {
            code: 'ACTION_AGENCY_INVOICE_APPROVE',
            title: 'Approve Invoice',
            description: 'Approval for manual invoice workflow.',
            type: 'ACTION',
          },
        ],
      },
      {
        id: 'agency-loading',
        title: 'Loading List',
        items: [
          {
            code: 'ROUTE_AGENCY_LOADING_LIST',
            title: 'View Loading List',
            description: 'Loading list review and tracking.',
            path: '/agency-module/loading-list/view-loading-list',
            type: 'ROUTE',
          },
        ],
      },
      {
        id: 'agency-return',
        title: 'Return',
        items: [
          {
            code: 'ROUTE_AGENCY_MARKET_RETURN',
            title: 'Market Return',
            description: 'Agency return operations.',
            path: '/agency-module/market-return/return',
            type: 'ROUTE',
          },
        ],
      },
      {
        id: 'agency-stock',
        title: 'Stock',
        items: [
          {
            code: 'ROUTE_AGENCY_STOCK_VIEW',
            title: 'View Stock',
            description: 'Agency stock visibility.',
            path: '/agency-module/stock/view-stock',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_AGENCY_STOCK_ADD',
            title: 'Add Stock',
            description: 'Stock additions and adjustments.',
            path: '/agency-module/stock/add-stock',
            type: 'ROUTE',
          },
          {
            code: 'ROUTE_AGENCY_STOCK_REQUEST',
            title: 'Request Order',
            description: 'Stock order requests.',
            path: '/agency-module/stock/request-order',
            type: 'ROUTE',
          },
          {
            code: 'ACTION_AGENCY_STOCK_APPROVE',
            title: 'Approve Stock Request',
            description: 'Approve stock request workflow.',
            type: 'ACTION',
          },
        ],
      },
    ],
  },
]

const permissionIndex = (() => {
  const allItems: PermissionItem[] = []
  const byModule: Record<string, PermissionItem[]> = {}
  const byCode: Record<string, PermissionItem> = {}
  permissionModules.forEach((module) => {
    const moduleItems: PermissionItem[] = []
    module.sections.forEach((section) => {
      section.items.forEach((item) => {
        allItems.push(item)
        moduleItems.push(item)
        byCode[item.code] = item
      })
    })
    byModule[module.id] = moduleItems
  })
  return { allItems, byModule, byCode }
})()

const moduleCodes = Object.fromEntries(
  Object.entries(permissionIndex.byModule).map(([id, items]) => [
    id,
    items.map((item) => item.code),
  ])
)

const groupCatalog: Group[] = [
  {
    id: 'SYSTEM_ADMIN',
    name: 'System Admin',
    description: 'Full platform administration and governance.',
    tags: ['All modules', 'Super access'],
  },
  {
    id: 'TOP_MANAGEMENT',
    name: 'Top Management',
    description: 'Executive oversight across KPIs and reporting.',
    tags: ['Dashboard', 'Reports'],
  },
  {
    id: 'SENIOR_MANAGER_SALES',
    name: 'Senior Manager Sales',
    description: 'Sales leadership with coverage and performance control.',
    tags: ['Sales', 'Outlet', 'Reports'],
  },
  {
    id: 'SENIOR_MANAGER_COMPANY',
    name: 'Senior Manager Company',
    description: 'Company-wide stakeholders with compliance focus.',
    tags: ['Admin', 'Reports'],
  },
  {
    id: 'MANAGER_COMPANY',
    name: 'Manager Company',
    description: 'Company operations with master data access.',
    tags: ['Admin', 'Master Settings'],
  },
  {
    id: 'MANAGER_SALES',
    name: 'Manager Sales',
    description: 'Regional and area sales managers.',
    tags: ['Sales', 'Outlet'],
  },
  {
    id: 'EXECUTIVE_SALES',
    name: 'Executive Sales',
    description: 'Sales execution and outlet operations.',
    tags: ['Outlet', 'Agency'],
  },
  {
    id: 'EXECUTIVE_COMPANY',
    name: 'Executive Company',
    description: 'Cross-functional executive access.',
    tags: ['Admin', 'Reports'],
  },
  {
    id: 'OPERATION_SALES',
    name: 'Operation Sales',
    description: 'Field force operational coverage.',
    tags: ['Agency', 'Outlet'],
  },
  {
    id: 'OPERATION_COMPANY',
    name: 'Operation Company',
    description: 'Company operations with limited admin tools.',
    tags: ['Admin', 'Agency'],
  },
]
const roleCatalog: Role[] = [
  {
    id: 'ADMIN',
    name: 'Admin',
    groupId: 'SYSTEM_ADMIN',
    description: 'System administration',
  },
  {
    id: 'MD',
    name: 'MD',
    groupId: 'TOP_MANAGEMENT',
    description: 'Managing Director',
  },
  {
    id: 'DGM',
    name: 'DGM',
    groupId: 'TOP_MANAGEMENT',
    description: 'Deputy General Manager',
  },
  {
    id: 'GM',
    name: 'GM',
    groupId: 'TOP_MANAGEMENT',
    description: 'General Manager',
  },
  {
    id: 'DF',
    name: 'DF',
    groupId: 'TOP_MANAGEMENT',
    description: 'Director Finance',
  },
  {
    id: 'CHANNEL_HEAD',
    name: 'Channel Head',
    groupId: 'SENIOR_MANAGER_SALES',
    description: 'Sales channel leadership',
  },
  {
    id: 'SUB_CHANNEL_HEAD',
    name: 'Sub Channel Head',
    groupId: 'SENIOR_MANAGER_SALES',
    description: 'Sub channel leadership',
  },
  {
    id: 'REGIONAL_SALES_MANAGER',
    name: 'Regional Sales Manager',
    groupId: 'MANAGER_SALES',
    description: 'Regional sales oversight',
  },
  {
    id: 'AREA_SALES_MANAGER',
    name: 'Area Sales Manager',
    groupId: 'MANAGER_SALES',
    description: 'Area sales oversight',
  },
  {
    id: 'AREA_SALES_EXECUTIVE',
    name: 'Area Sales Executive',
    groupId: 'EXECUTIVE_SALES',
    description: 'Area sales execution',
  },
  {
    id: 'REP',
    name: 'Representative',
    groupId: 'OPERATION_SALES',
    description: 'Sales representative',
  },
  {
    id: 'AGENT',
    name: 'Agent',
    groupId: 'OPERATION_SALES',
    description: 'Sales agent',
  },
  {
    id: 'FINANCE',
    name: 'Finance',
    groupId: 'EXECUTIVE_COMPANY',
    description: 'Finance operations',
  },
  {
    id: 'CCU',
    name: 'CCU',
    groupId: 'EXECUTIVE_COMPANY',
    description: 'Central control unit',
  },
  {
    id: 'INTERNAL_AUDIT',
    name: 'Internal Audit',
    groupId: 'EXECUTIVE_COMPANY',
    description: 'Compliance and audit',
  },
  {
    id: 'BRAND',
    name: 'Brand',
    groupId: 'EXECUTIVE_COMPANY',
    description: 'Brand operations',
  },
]

const groupPermissionMap: Record<string, string[]> = {
  SYSTEM_ADMIN: permissionIndex.allItems.map((item) => item.code),
  TOP_MANAGEMENT: [
    ...moduleCodes.dashboard,
    ...moduleCodes.reports,
    'ACTION_ADMIN_USER_EXPORT',
  ],
  SENIOR_MANAGER_SALES: [
    ...moduleCodes.dashboard,
    ...moduleCodes.sales,
    ...moduleCodes.outlet,
    ...moduleCodes.reports,
  ],
  SENIOR_MANAGER_COMPANY: [
    ...moduleCodes.dashboard,
    ...moduleCodes.reports,
    ...moduleCodes.admin,
  ],
  MANAGER_COMPANY: [
    ...moduleCodes.dashboard,
    ...moduleCodes['master-settings'],
    ...moduleCodes.admin,
  ],
  MANAGER_SALES: [
    ...moduleCodes.sales,
    ...moduleCodes.outlet,
    ...moduleCodes.reports,
  ],
  EXECUTIVE_SALES: [...moduleCodes.outlet, ...moduleCodes.agency],
  EXECUTIVE_COMPANY: [...moduleCodes.admin, ...moduleCodes.reports],
  OPERATION_SALES: [...moduleCodes.outlet, ...moduleCodes.agency],
  OPERATION_COMPANY: [...moduleCodes.admin, ...moduleCodes.agency],
}

const rolePermissionMap: Record<string, string[]> = {
  ADMIN: permissionIndex.allItems.map((item) => item.code),
  MD: [...moduleCodes.dashboard, ...moduleCodes.reports],
  DGM: [...moduleCodes.dashboard, ...moduleCodes.reports],
  GM: [...moduleCodes.dashboard, ...moduleCodes.reports],
  DF: [...moduleCodes.dashboard, ...moduleCodes.reports],
  CHANNEL_HEAD: [...moduleCodes.sales, ...moduleCodes['master-settings']],
  SUB_CHANNEL_HEAD: [...moduleCodes.sales],
  REGIONAL_SALES_MANAGER: [...moduleCodes.sales, ...moduleCodes.outlet],
  AREA_SALES_MANAGER: [...moduleCodes.sales, ...moduleCodes.outlet],
  AREA_SALES_EXECUTIVE: [...moduleCodes.outlet, ...moduleCodes.agency],
  REP: [...moduleCodes.outlet, ...moduleCodes.agency],
  AGENT: [...moduleCodes.agency],
  FINANCE: [...moduleCodes.reports, ...moduleCodes.admin],
  CCU: [...moduleCodes.admin, ...moduleCodes.reports],
  INTERNAL_AUDIT: [...moduleCodes.admin, ...moduleCodes.reports],
  BRAND: [...moduleCodes.dashboard, ...moduleCodes.reports],
}

const initialOverrides: Record<string, PermissionOverride> = {
  'U-1002': {
    allow: ['ROUTE_MASTER_DEMARCATION'],
    deny: ['ROUTE_ADMIN_MANUAL_BILL_QUOTA'],
  },
  'U-1006': {
    allow: ['ROUTE_AGENCY_STOCK_REQUEST'],
    deny: ['ACTION_AGENCY_STOCK_APPROVE'],
  },
}

const statusOptions: UserStatus[] = ['Active', 'Inactive', 'Suspended']
const userPageSize = 4
const cardGapClass = 'gap-2'
const statusBadgeStyles: Record<UserStatus, string> = {
  Active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Inactive: 'border-slate-200 bg-slate-50 text-slate-600',
  Suspended: 'border-rose-200 bg-rose-50 text-rose-700',
}
const groupBadgeStyles: Record<string, string> = {
  SYSTEM_ADMIN: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  TOP_MANAGEMENT: 'border-blue-200 bg-blue-50 text-blue-700',
  SENIOR_MANAGER_SALES: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  SENIOR_MANAGER_COMPANY: 'border-violet-200 bg-violet-50 text-violet-700',
  MANAGER_COMPANY: 'border-amber-200 bg-amber-50 text-amber-700',
  MANAGER_SALES: 'border-teal-200 bg-teal-50 text-teal-700',
  EXECUTIVE_SALES: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  EXECUTIVE_COMPANY: 'border-sky-200 bg-sky-50 text-sky-700',
  OPERATION_SALES: 'border-orange-200 bg-orange-50 text-orange-700',
  OPERATION_COMPANY: 'border-lime-200 bg-lime-50 text-lime-700',
}

export const Route = createFileRoute(
  '/_authenticated/admin-module/user-module/manage-permission'
)({
  beforeLoad: () => ensureRoleAccess([RoleId.SystemAdmin]),
  component: ManageUserPermission,
})

function ManageUserPermission() {
  const {
    data: usersResponse,
    isLoading: isUsersLoading,
    isError: isUsersError,
    error: usersError,
  } = useQuery({
    queryKey: ['user-demarcation', 'users'],
    queryFn: getAllUsers,
  })

  const apiUsers = useMemo<UserProfile[]>(() => {
    const payload = usersResponse?.payload ?? []
    return payload.map((user) => {
      const groupId = roleIdToGroupId[user.roleId] ?? 'UNKNOWN'
      const roleId = subRoleIdToRoleId[user.subRoleId]
      return {
        id: String(user.id),
        name: formatDisplayName(user),
        email: user.email?.trim() || '-',
        groupId,
        roleIds: roleId ? [roleId] : [],
        status: user.isActive ? 'Active' : 'Inactive',
        title:
          user.roleName?.trim() ||
          user.subRoleName?.trim() ||
          user.userGroupName?.trim() ||
          'User',
        lastActive: formatOptionalDate(user.startDate),
        location: '-',
      }
    })
  }, [usersResponse])

  const [users, setUsers] = useState<UserProfile[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [overridesByUser, setOverridesByUser] =
    useState<Record<string, PermissionOverride>>(initialOverrides)
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('All')
  const [roleFilter, setRoleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'All'>('All')
  const [permissionSearch, setPermissionSearch] = useState('')
  const [permissionTypeFilter, setPermissionTypeFilter] = useState<
    PermissionType | 'All'
  >('All')
  const [overridePermission, setOverridePermission] = useState('')
  const [overrideEffect, setOverrideEffect] = useState<'ALLOW' | 'DENY'>(
    'ALLOW'
  )
  const [openModuleId, setOpenModuleId] = useState<string | null>(null)
  const hasActiveUserFilters =
    search.trim() !== '' ||
    groupFilter !== 'All' ||
    roleFilter !== 'All' ||
    statusFilter !== 'All'

  useEffect(() => {
    setUsers(apiUsers)
  }, [apiUsers])

  useEffect(() => {
    if (!selectedUserId) return
    if (!users.some((user) => user.id === selectedUserId)) {
      setSelectedUserId('')
    }
  }, [selectedUserId, users])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((user) => {
      const matchesQuery =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query)
      const matchesGroup = groupFilter === 'All' || user.groupId === groupFilter
      const matchesRole =
        roleFilter === 'All' || user.roleIds.includes(roleFilter)
      const matchesStatus =
        statusFilter === 'All' || user.status === statusFilter
      return matchesQuery && matchesGroup && matchesRole && matchesStatus
    })
  }, [groupFilter, roleFilter, search, statusFilter, users])

  useEffect(() => {
    if (!selectedUserId) return
    if (!filteredUsers.some((user) => user.id === selectedUserId)) {
      setSelectedUserId('')
    }
  }, [filteredUsers, selectedUserId])

  useEffect(() => {
    setCurrentPage(1)
  }, [groupFilter, roleFilter, search, statusFilter, users])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredUsers.length / userPageSize)),
    [filteredUsers.length]
  )
  const safePage = Math.min(currentPage, totalPages)
  const showPagination = filteredUsers.length > userPageSize

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])
  const pageStart = (safePage - 1) * userPageSize
  const pageEnd = pageStart + userPageSize
  const visibleUsers = useMemo(
    () => filteredUsers.slice(pageStart, pageEnd),
    [filteredUsers, pageEnd, pageStart]
  )
  const pageItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1)
    }
    const items: Array<number | 'ellipsis'> = [1]
    const showLeft = safePage > 3
    const showRight = safePage < totalPages - 2
    if (showLeft) items.push('ellipsis')
    const start = Math.max(2, safePage - 1)
    const end = Math.min(totalPages - 1, safePage + 1)
    for (let page = start; page <= end; page += 1) {
      items.push(page)
    }
    if (showRight) items.push('ellipsis')
    items.push(totalPages)
    return items
  }, [safePage, totalPages])

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users]
  )

  const userOverrides = useMemo(
    () => overridesByUser[selectedUserId] ?? { allow: [], deny: [] },
    [overridesByUser, selectedUserId]
  )

  const basePermissionState = useMemo(() => {
    if (!selectedUser) return { base: new Set<string>(), source: {} }
    const groupCodes = groupPermissionMap[selectedUser.groupId] ?? []
    const roleCodes = selectedUser.roleIds.flatMap(
      (role) => rolePermissionMap[role] ?? []
    )
    const source: Record<string, string> = {}
    groupCodes.forEach((code) => {
      source[code] = 'Group'
    })
    roleCodes.forEach((code) => {
      source[code] = source[code] ? 'Group + Role' : 'Role'
    })
    const base = new Set<string>([...groupCodes, ...roleCodes])
    return { base, source }
  }, [selectedUser])

  const effectivePermissions = useMemo(() => {
    const effective = new Set(basePermissionState.base)
    userOverrides.allow.forEach((code) => effective.add(code))
    userOverrides.deny.forEach((code) => effective.delete(code))
    return effective
  }, [basePermissionState.base, userOverrides])

  const permissionSummary = useMemo(() => {
    const total = permissionIndex.allItems.length
    const allowed = Array.from(effectivePermissions).length
    const overrides = userOverrides.allow.length + userOverrides.deny.length
    return { total, allowed, overrides }
  }, [effectivePermissions, userOverrides])

  const permissionOptions = useMemo(() => {
    return permissionIndex.allItems.map((item) => ({
      label: `${item.title} (${item.code})`,
      value: item.code,
    }))
  }, [])

  const groupOptions = useMemo(() => {
    return ['All', ...groupCatalog.map((group) => group.id)]
  }, [])

  const roleOptions = useMemo(() => {
    return ['All', ...roleCatalog.map((role) => role.id)]
  }, [])

  const userCountLabel = isUsersLoading
    ? '...'
    : isUsersError
      ? '0/0'
      : `${filteredUsers.length}/${users.length}`

  const updateOverrides = (
    permissionCodes: string[],
    effect: 'ALLOW' | 'DENY' | 'CLEAR'
  ) => {
    if (!selectedUserId) return
    setOverridesByUser((prev) => {
      const current = prev[selectedUserId] ?? { allow: [], deny: [] }
      const allow = new Set(current.allow)
      const deny = new Set(current.deny)

      permissionCodes.forEach((code) => {
        if (effect === 'ALLOW') {
          allow.add(code)
          deny.delete(code)
          return
        }
        if (effect === 'DENY') {
          deny.add(code)
          allow.delete(code)
          return
        }
        allow.delete(code)
        deny.delete(code)
      })

      return {
        ...prev,
        [selectedUserId]: {
          allow: Array.from(allow),
          deny: Array.from(deny),
        },
      }
    })
  }
  const assignGroup = (groupId: string) => {
    if (!selectedUserId) return
    setUsers((prev) =>
      prev.map((user) =>
        user.id === selectedUserId ? { ...user, groupId } : user
      )
    )
  }

  const toggleRole = (roleId: string) => {
    if (!selectedUserId) return
    setUsers((prev) =>
      prev.map((user) => {
        if (user.id !== selectedUserId) return user
        const hasRole = user.roleIds.includes(roleId)
        return {
          ...user,
          roleIds: hasRole
            ? user.roleIds.filter((id) => id !== roleId)
            : [...user.roleIds, roleId],
        }
      })
    )
  }

  const filteredPermissionModules = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase()
    const typeFilter = permissionTypeFilter
    return permissionModules
      .map((module) => {
        const sections = module.sections
          .map((section) => {
            const items = section.items.filter((item) => {
              const matchesQuery =
                !query ||
                item.title.toLowerCase().includes(query) ||
                item.code.toLowerCase().includes(query) ||
                item.path?.toLowerCase().includes(query)
              const matchesType =
                typeFilter === 'All' || item.type === typeFilter
              return matchesQuery && matchesType
            })
            return items.length ? { ...section, items } : null
          })
          .filter(Boolean) as PermissionSection[]
        return sections.length ? { ...module, sections } : null
      })
      .filter(Boolean) as PermissionModule[]
  }, [permissionSearch, permissionTypeFilter])

  useEffect(() => {
    if (!filteredPermissionModules.length) {
      setOpenModuleId(null)
      return
    }
    const hasActive = filteredPermissionModules.some(
      (module) => module.id === openModuleId
    )
    if (!hasActive) {
      setOpenModuleId(filteredPermissionModules[0].id)
    }
  }, [filteredPermissionModules, openModuleId])

  const handleClearUserFilters = () => {
    setSearch('')
    setGroupFilter('All')
    setRoleFilter('All')
    setStatusFilter('All')
  }

  return (
    <Main>
      <PageHeader
        title='Access Management'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Admin Module' },
          { label: 'User Module' },
          { label: 'Access Management' },
        ]}
      />

      <div className='grid gap-4 xl:grid-cols-[360px,1fr]'>
        <Card className={cardGapClass}>
          <CardHeader className='space-y-2'>
            <div className='flex items-center justify-between gap-2'>
              <CardTitle className='flex items-center gap-2'>
                <Users className='text-muted-foreground h-4 w-4' />
                Users
              </CardTitle>
              <Badge variant='secondary' className='text-xs font-medium'>
                {userCountLabel}
              </Badge>
            </div>
            <p className='text-muted-foreground text-sm'>
              Select a user to configure access policies.
            </p>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex items-center gap-2 overflow-x-auto overflow-y-visible'>
              <Input
                placeholder='Search by name, email, or ID'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className='h-9 w-[280px] sm:w-[320px] lg:w-[360px]'
              />
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className='h-9 w-[150px]'>
                  <SelectValue placeholder='Group' />
                </SelectTrigger>
                <SelectContent>
                  {groupOptions.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group === 'All'
                        ? 'All Groups'
                        : (groupCatalog.find((g) => g.id === group)?.name ??
                          group)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className='h-9 w-[150px]'>
                  <SelectValue placeholder='Role' />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role === 'All'
                        ? 'All Roles'
                        : (roleCatalog.find((r) => r.id === role)?.name ??
                          role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as UserStatus | 'All')
                }
              >
                <SelectTrigger className='h-9 w-[140px]'>
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='All'>All Status</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant='outline'
                className='h-9'
                onClick={handleClearUserFilters}
                disabled={!hasActiveUserFilters}
              >
                Clear
              </Button>
            </div>
            <div className='space-y-2'>
              <div className='space-y-2'>
                {isUsersLoading ? (
                  <div className='space-y-2'>
                    {Array.from({ length: userPageSize }).map((_, index) => (
                      <div
                        key={`user-skeleton-${index}`}
                        className='flex w-full items-stretch rounded-lg border'
                      >
                        <div className='flex w-10 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-50'>
                          <Skeleton className='h-4 w-4 rounded-full' />
                        </div>
                        <div className='flex flex-1 items-center gap-3 px-3 py-3'>
                          <Skeleton className='h-12 w-12 rounded-full' />
                          <div className='flex-1 space-y-2'>
                            <div className='flex items-start justify-between gap-2'>
                              <div className='space-y-2'>
                                <Skeleton className='h-4 w-36' />
                                <Skeleton className='h-3 w-48' />
                              </div>
                              <Skeleton className='h-5 w-16 rounded-full' />
                            </div>
                            <div className='flex items-center gap-2'>
                              <Skeleton className='h-5 w-24 rounded-full' />
                              <Skeleton className='h-3 w-28' />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : isUsersError ? (
                  <div className='text-destructive text-sm'>
                    {(usersError as Error)?.message ?? 'Failed to load users.'}
                  </div>
                ) : visibleUsers.length === 0 ? (
                  <Alert variant='info'>
                    <Info />
                    <AlertTitle>No matching users</AlertTitle>
                    <AlertDescription>
                      No users match these filters. Try adjusting the search or
                      filters.
                    </AlertDescription>
                  </Alert>
                ) : (
                  visibleUsers.map((user) => {
                    const isSelected = user.id === selectedUserId
                    const group = groupCatalog.find(
                      (g) => g.id === user.groupId
                    )
                    return (
                      <button
                        key={user.id}
                        type='button'
                        onClick={() => setSelectedUserId(user.id)}
                        className={cn(
                          'flex w-full items-stretch rounded-lg border text-left transition hover:bg-slate-50',
                          isSelected && 'border-sky-300 bg-sky-50 shadow-sm'
                        )}
                      >
                        <div
                          className={cn(
                            'flex w-10 shrink-0 items-center justify-center border-r',
                            isSelected
                              ? 'border-sky-200 bg-sky-100/70'
                              : 'border-slate-200 bg-slate-50'
                          )}
                        >
                          {isSelected ? (
                            <CheckCircle2 className='h-5 w-5 text-sky-600' />
                          ) : (
                            <span className='h-4 w-4 rounded-full border border-slate-300 bg-white' />
                          )}
                        </div>
                        <div className='flex flex-1 items-center gap-3 px-3 py-3'>
                          <div className='flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-base font-semibold'>
                            {user.name
                              .split(' ')
                              .map((part) => part[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                          <div className='min-w-0 flex-1 space-y-1'>
                            <div className='flex items-start justify-between gap-2'>
                              <div className='min-w-0'>
                                <div className='truncate font-medium'>
                                  {user.name}
                                </div>
                                <div className='text-muted-foreground truncate text-xs'>
                                  {user.email}
                                </div>
                              </div>
                              <Badge
                                variant='outline'
                                className={statusBadgeStyles[user.status]}
                              >
                                {user.status}
                              </Badge>
                            </div>
                            <div className='flex flex-wrap items-center gap-2 text-xs text-slate-600'>
                              <Badge
                                variant='outline'
                                className={cn(
                                  'text-[11px]',
                                  groupBadgeStyles[user.groupId] ??
                                    'border-slate-200 bg-slate-50 text-slate-600'
                                )}
                              >
                                {group?.name ?? user.groupId}
                              </Badge>
                              <span className='text-slate-300'>|</span>
                              <span className='truncate'>{user.title}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
              {showPagination ? (
                <div className='text-muted-foreground flex flex-wrap items-center justify-between gap-2 pt-2 text-xs'>
                  <span>
                    Showing {visibleUsers.length ? pageStart + 1 : 0}-
                    {Math.min(
                      pageStart + visibleUsers.length,
                      filteredUsers.length
                    )}{' '}
                    of {filteredUsers.length}
                  </span>
                  <Pagination className='w-auto justify-end'>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          disabled={safePage === 1}
                          onClick={() =>
                            setCurrentPage((page) => Math.max(1, page - 1))
                          }
                        />
                      </PaginationItem>
                      {pageItems.map((item, index) =>
                        item === 'ellipsis' ? (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={item}>
                            <PaginationLink
                              isActive={item === safePage}
                              onClick={() => setCurrentPage(item)}
                            >
                              {item}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          disabled={safePage === totalPages}
                          onClick={() =>
                            setCurrentPage((page) =>
                              Math.min(totalPages, page + 1)
                            )
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className='space-y-4'>
          {selectedUser ? (
            <>
              <Card className={cardGapClass}>
                <CardHeader className='space-y-2'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div className='space-y-1'>
                      <CardTitle className='flex items-center gap-2'>
                        <Shield className='text-muted-foreground h-4 w-4' />
                        Access Profile
                      </CardTitle>
                      <p className='text-muted-foreground text-sm'>
                        Role-based permissions with user-level overrides.
                      </p>
                    </div>
                    {selectedUser ? (
                      <div className='flex flex-wrap items-center gap-2'>
                        <Badge variant='outline'>User: {selectedUser.id}</Badge>
                        <Badge variant='secondary'>
                          Overrides: {permissionSummary.overrides}
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedUser ? (
                    <div className='grid gap-3 lg:grid-cols-4'>
                      <div className='rounded-lg border bg-slate-50 px-4 py-3'>
                        <div className='text-muted-foreground text-xs tracking-wide uppercase'>
                          Group
                        </div>
                        <div className='mt-2 text-sm font-semibold'>
                          {
                            groupCatalog.find(
                              (group) => group.id === selectedUser.groupId
                            )?.name
                          }
                        </div>
                      </div>
                      <div className='rounded-lg border bg-slate-50 px-4 py-3'>
                        <div className='text-muted-foreground text-xs tracking-wide uppercase'>
                          Roles
                        </div>
                        <div className='mt-2 flex flex-wrap gap-1 text-xs font-semibold'>
                          {selectedUser.roleIds.map((roleId) => (
                            <Badge
                              key={roleId}
                              variant='outline'
                              className={cn(
                                'text-[11px]',
                                groupBadgeStyles[selectedUser.groupId] ??
                                  'border-slate-200 bg-slate-50 text-slate-600'
                              )}
                            >
                              {roleCatalog.find((role) => role.id === roleId)
                                ?.name ?? roleId}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className='rounded-lg border bg-slate-50 px-4 py-3'>
                        <div className='text-muted-foreground text-xs tracking-wide uppercase'>
                          Effective Access
                        </div>
                        <div className='mt-2 flex items-center gap-2'>
                          <CheckCircle2 className='h-4 w-4 text-emerald-600' />
                          <span className='text-sm font-semibold'>
                            {permissionSummary.allowed}/
                            {permissionSummary.total}
                          </span>
                        </div>
                      </div>
                      <div className='rounded-lg border bg-slate-50 px-4 py-3'>
                        <div className='text-muted-foreground text-xs tracking-wide uppercase'>
                          Last Activity
                        </div>
                        <div className='mt-2 text-sm font-semibold'>
                          {selectedUser.lastActive}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className='text-muted-foreground text-sm'>
                      Select a user to view access details.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Tabs defaultValue='permissions' className='space-y-4'>
                <TabsList className='justify-start'>
                  <TabsTrigger value='permissions'>Permissions</TabsTrigger>
                  <TabsTrigger value='groups'>Groups</TabsTrigger>
                  <TabsTrigger value='roles'>Roles</TabsTrigger>
                  <TabsTrigger value='overrides'>Overrides</TabsTrigger>
                </TabsList>

                <TabsContent value='permissions' className='space-y-4'>
                  <Card className={cardGapClass}>
                <CardContent className='space-y-4'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div className='flex items-center gap-2 text-sm font-medium text-slate-700'>
                      <Filter className='h-4 w-4' />
                      Permission Filters
                    </div>
                  </div>
                  <div className='flex flex-wrap items-center gap-3'>
                    <Input
                      placeholder='Search by name, code, or path'
                      value={permissionSearch}
                      onChange={(event) =>
                        setPermissionSearch(event.target.value)
                      }
                      className='h-9 w-full min-w-[220px] sm:w-[320px] lg:w-[360px]'
                    />
                    <Select
                      value={permissionTypeFilter}
                      onValueChange={(value) =>
                        setPermissionTypeFilter(
                          value as PermissionType | 'All'
                        )
                      }
                    >
                      <SelectTrigger className='h-9 w-[150px]'>
                        <SelectValue placeholder='Type' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='All'>All Types</SelectItem>
                        <SelectItem value='ROUTE'>Route</SelectItem>
                        <SelectItem value='ACTION'>Action</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    Filter by module, type, or keyword
                  </div>
                </CardContent>
              </Card>

                  <div className='space-y-4'>
                    {isUsersLoading ? (
                      Array.from({ length: 2 }).map((_, index) => (
                        <Card
                          key={`permission-skeleton-${index}`}
                          className={cardGapClass}
                        >
                          <CardHeader className='space-y-2'>
                            <div className='flex flex-wrap items-center justify-between gap-3'>
                              <div className='space-y-2'>
                                <Skeleton className='h-4 w-32' />
                                <Skeleton className='h-3 w-52' />
                              </div>
                              <div className='flex items-center gap-2'>
                                <Skeleton className='h-6 w-20 rounded-full' />
                                <Skeleton className='h-8 w-20 rounded-md' />
                                <Skeleton className='h-8 w-20 rounded-md' />
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className='space-y-3'>
                            {Array.from({ length: 2 }).map(
                              (_, sectionIndex) => (
                                <div
                                  key={`permission-skeleton-${index}-section-${sectionIndex}`}
                                  className='space-y-2'
                                >
                                  <div className='flex items-center justify-between'>
                                    <Skeleton className='h-4 w-28' />
                                    <Skeleton className='h-5 w-16 rounded-full' />
                                  </div>
                                  <div className='space-y-2'>
                                    {Array.from({ length: 3 }).map(
                                      (_, rowIndex) => (
                                        <div
                                          key={`permission-skeleton-${index}-row-${rowIndex}`}
                                          className='flex items-center justify-between gap-3 rounded-md border px-3 py-2'
                                        >
                                          <div className='space-y-2'>
                                            <Skeleton className='h-3 w-40' />
                                            <Skeleton className='h-3 w-56' />
                                          </div>
                                          <div className='flex items-center gap-2'>
                                            <Skeleton className='h-6 w-16 rounded-full' />
                                            <Skeleton className='h-6 w-16 rounded-full' />
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      filteredPermissionModules.map((module) => {
                        const moduleItems =
                          permissionIndex.byModule[module.id] ?? []
                        const allowedCount = moduleItems.filter((item) =>
                          effectivePermissions.has(item.code)
                        ).length
                        return (
                          <Collapsible
                            key={module.id}
                            open={openModuleId === module.id}
                            onOpenChange={(isOpen) =>
                              setOpenModuleId(isOpen ? module.id : null)
                            }
                          >
                            <Card className={cardGapClass}>
                              <CardHeader className='space-y-2'>
                                <div className='flex flex-wrap items-center justify-between gap-3'>
                                  <div>
                                    <CardTitle>{module.title}</CardTitle>
                                    <p className='text-muted-foreground text-sm'>
                                      {module.description}
                                    </p>
                                  </div>
                                  <div className='flex flex-wrap items-center gap-2'>
                                    <Badge variant='outline'>
                                      {allowedCount}/{moduleItems.length}{' '}
                                      enabled
                                    </Badge>
                                    <Button
                                      size='sm'
                                      variant='outline'
                                      onClick={() =>
                                        updateOverrides(
                                          moduleItems.map((item) => item.code),
                                          'ALLOW'
                                        )
                                      }
                                    >
                                      Allow all
                                    </Button>
                                    <Button
                                      size='sm'
                                      variant='outline'
                                      onClick={() =>
                                        updateOverrides(
                                          moduleItems.map((item) => item.code),
                                          'DENY'
                                        )
                                      }
                                    >
                                      Deny all
                                    </Button>
                                    <CollapsibleTrigger asChild>
                                      <Button
                                        size='icon'
                                        variant='ghost'
                                        className='h-8 w-8 transition-transform data-[state=open]:rotate-180'
                                        aria-label={`Toggle ${module.title}`}
                                      >
                                        <ChevronDown className='h-4 w-4' />
                                      </Button>
                                    </CollapsibleTrigger>
                                  </div>
                                </div>
                              </CardHeader>
                              <CollapsibleContent>
                                <CardContent className='space-y-4'>
                                  {module.sections.map((section) => (
                                    <div key={section.id} className='space-y-2'>
                                      <div className='flex items-center justify-between'>
                                        <div className='text-sm font-semibold'>
                                          {section.title}
                                        </div>
                                        <Badge
                                          variant='secondary'
                                          className='text-xs'
                                        >
                                          {
                                            section.items.filter((item) =>
                                              effectivePermissions.has(
                                                item.code
                                              )
                                            ).length
                                          }
                                          /{section.items.length}
                                        </Badge>
                                      </div>
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Permission</TableHead>
                                            <TableHead>Resource</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Access</TableHead>
                                            <TableHead className='text-right'>
                                              Actions
                                            </TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {section.items.map((item) => {
                                            const isAllowed =
                                              effectivePermissions.has(
                                                item.code
                                              )
                                            const isAllowOverride =
                                              userOverrides.allow.includes(
                                                item.code
                                              )
                                            const isDenyOverride =
                                              userOverrides.deny.includes(
                                                item.code
                                              )
                                            const source = isAllowOverride
                                              ? 'Custom Allow'
                                              : isDenyOverride
                                                ? 'Custom Deny'
                                                : (basePermissionState.source[
                                                    item.code
                                                  ] ?? 'Not granted')
                                            return (
                                              <TableRow key={item.code}>
                                                <TableCell className='font-medium'>
                                                  {item.title}
                                                  <div className='text-muted-foreground text-xs'>
                                                    {item.description}
                                                  </div>
                                                </TableCell>
                                                <TableCell className='text-muted-foreground text-xs'>
                                                  {item.path ?? item.code}
                                                </TableCell>
                                                <TableCell>
                                                  <Badge
                                                    variant={
                                                      item.type === 'ACTION'
                                                        ? 'outline'
                                                        : 'secondary'
                                                    }
                                                  >
                                                    {item.type}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell>
                                                  <div className='flex flex-col gap-1 text-xs'>
                                                    <Badge
                                                      variant={
                                                        isAllowed
                                                          ? 'secondary'
                                                          : 'outline'
                                                      }
                                                      className='w-fit'
                                                    >
                                                      {isAllowed
                                                        ? 'Allowed'
                                                        : 'Blocked'}
                                                    </Badge>
                                                    <span className='text-muted-foreground'>
                                                      {source}
                                                    </span>
                                                  </div>
                                                </TableCell>
                                                <TableCell className='text-right'>
                                                  <div className='flex items-center justify-end gap-2'>
                                                    <Button
                                                      size='sm'
                                                      variant='outline'
                                                      onClick={() =>
                                                        updateOverrides(
                                                          [item.code],
                                                          'ALLOW'
                                                        )
                                                      }
                                                    >
                                                      Allow
                                                    </Button>
                                                    <Button
                                                      size='sm'
                                                      variant='outline'
                                                      onClick={() =>
                                                        updateOverrides(
                                                          [item.code],
                                                          'DENY'
                                                        )
                                                      }
                                                    >
                                                      Deny
                                                    </Button>
                                                    <Button
                                                      size='sm'
                                                      variant='ghost'
                                                      onClick={() =>
                                                        updateOverrides(
                                                          [item.code],
                                                          'CLEAR'
                                                        )
                                                      }
                                                    >
                                                      Clear
                                                    </Button>
                                                  </div>
                                                </TableCell>
                                              </TableRow>
                                            )
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  ))}
                                </CardContent>
                              </CollapsibleContent>
                            </Card>
                          </Collapsible>
                        )
                      })
                    )}
                  </div>
                </TabsContent>
                <TabsContent value='groups'>
                  <div className='grid gap-4 lg:grid-cols-[1.2fr,0.8fr]'>
                    <Card className={cardGapClass}>
                      <CardHeader className='space-y-1'>
                        <CardTitle>Primary Group</CardTitle>
                        <p className='text-muted-foreground text-sm'>
                          Assign the main user group. This drives baseline
                          access.
                        </p>
                      </CardHeader>
                      <CardContent className='space-y-3'>
                        {groupCatalog.map((group) => {
                          const isActive = selectedUser?.groupId === group.id
                          const permissionCount =
                            groupPermissionMap[group.id]?.length ?? 0
                          return (
                            <div
                              key={group.id}
                              className={cn(
                                'rounded-lg border p-4 transition',
                                isActive
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:border-slate-300'
                              )}
                            >
                              <div className='flex flex-wrap items-center justify-between gap-3'>
                                <div>
                                  <div className='text-sm font-semibold'>
                                    {group.name}
                                  </div>
                                  <div className='text-muted-foreground text-xs'>
                                    {group.description}
                                  </div>
                                </div>
                                <div className='flex items-center gap-2'>
                                  <Badge variant='outline'>
                                    {permissionCount} perms
                                  </Badge>
                                  <Button
                                    size='sm'
                                    variant={isActive ? 'secondary' : 'outline'}
                                    onClick={() => assignGroup(group.id)}
                                  >
                                    {isActive ? 'Assigned' : 'Assign'}
                                  </Button>
                                </div>
                              </div>
                              <div className='mt-3 flex flex-wrap gap-2'>
                                {group.tags.map((tag) => (
                                  <Badge key={tag} variant='secondary'>
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>

                    <Card className={cardGapClass}>
                      <CardHeader className='space-y-1'>
                        <CardTitle>Group Access Summary</CardTitle>
                        <p className='text-muted-foreground text-sm'>
                          Highlights of permissions coming from the selected
                          group.
                        </p>
                      </CardHeader>
                      <CardContent className='space-y-3'>
                        {permissionModules.map((module) => {
                          const moduleItems =
                            permissionIndex.byModule[module.id] ?? []
                          const groupCodes =
                            groupPermissionMap[selectedUser?.groupId ?? ''] ??
                            []
                          const enabledCount = moduleItems.filter((item) =>
                            groupCodes.includes(item.code)
                          ).length
                          return (
                            <div
                              key={module.id}
                              className='flex items-center justify-between rounded-lg border px-3 py-2 text-sm'
                            >
                              <div>
                                <div className='font-medium'>
                                  {module.title}
                                </div>
                                <div className='text-muted-foreground text-xs'>
                                  {module.description}
                                </div>
                              </div>
                              <Badge variant='outline'>
                                {enabledCount}/{moduleItems.length}
                              </Badge>
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value='roles'>
                  <div className='grid gap-4 lg:grid-cols-[1.2fr,0.8fr]'>
                    <Card className={cardGapClass}>
                      <CardHeader className='space-y-1'>
                        <CardTitle>Role Assignments</CardTitle>
                        <p className='text-muted-foreground text-sm'>
                          Add or remove sub-roles to refine access beyond the
                          group.
                        </p>
                      </CardHeader>
                      <CardContent className='space-y-4'>
                        {groupCatalog.map((group) => {
                          const roles = roleCatalog.filter(
                            (role) => role.groupId === group.id
                          )
                          if (!roles.length) return null
                          return (
                            <div key={group.id} className='space-y-2'>
                              <div className='text-sm font-semibold'>
                                {group.name}
                              </div>
                              <div className='grid gap-2 sm:grid-cols-2'>
                                {roles.map((role) => {
                                  const checked =
                                    selectedUser?.roleIds.includes(role.id) ??
                                    false
                                  return (
                                    <label
                                      key={role.id}
                                      className='flex items-start gap-3 rounded-lg border px-3 py-2 text-sm'
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={() =>
                                          toggleRole(role.id)
                                        }
                                      />
                                      <div>
                                        <div className='font-medium'>
                                          {role.name}
                                        </div>
                                        <div className='text-muted-foreground text-xs'>
                                          {role.description}
                                        </div>
                                      </div>
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>

                    <Card className={cardGapClass}>
                      <CardHeader className='space-y-1'>
                        <CardTitle>Role Impact</CardTitle>
                        <p className='text-muted-foreground text-sm'>
                          Permissions gained from selected roles.
                        </p>
                      </CardHeader>
                      <CardContent className='space-y-3'>
                        {selectedUser?.roleIds.length ? (
                          selectedUser.roleIds.map((roleId) => {
                            const role = roleCatalog.find(
                              (r) => r.id === roleId
                            )
                            const count = rolePermissionMap[roleId]?.length ?? 0
                            return (
                              <div
                                key={roleId}
                                className='flex items-center justify-between rounded-lg border px-3 py-2'
                              >
                                <div>
                                  <div className='text-sm font-medium'>
                                    {role?.name ?? roleId}
                                  </div>
                                  <div className='text-muted-foreground text-xs'>
                                    {role?.description}
                                  </div>
                                </div>
                                <Badge variant='outline'>{count} perms</Badge>
                              </div>
                            )
                          })
                        ) : (
                          <div className='text-muted-foreground text-sm'>
                            Assign roles to view their permission impact.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value='overrides'>
                  <div className='grid gap-4 lg:grid-cols-[1.2fr,0.8fr]'>
                    <Card className={cardGapClass}>
                      <CardHeader className='space-y-1'>
                        <CardTitle>User Overrides</CardTitle>
                        <p className='text-muted-foreground text-sm'>
                          Apply custom allow/deny rules for specific users.
                        </p>
                      </CardHeader>
                      <CardContent className='space-y-4'>
                        <div className='rounded-lg border bg-slate-50 p-4'>
                          <div className='text-sm font-semibold'>
                            Add Override
                          </div>
                          <div className='mt-3 grid gap-2 md:grid-cols-[1fr,140px,auto]'>
                            <Select
                              value={overridePermission}
                              onValueChange={setOverridePermission}
                            >
                              <SelectTrigger className='h-9'>
                                <SelectValue placeholder='Select permission' />
                              </SelectTrigger>
                              <SelectContent>
                                <ScrollArea className='h-60'>
                                  {permissionOptions.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </ScrollArea>
                              </SelectContent>
                            </Select>
                            <Select
                              value={overrideEffect}
                              onValueChange={(value) =>
                                setOverrideEffect(value as 'ALLOW' | 'DENY')
                              }
                            >
                              <SelectTrigger className='h-9'>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='ALLOW'>Allow</SelectItem>
                                <SelectItem value='DENY'>Deny</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size='sm'
                              onClick={() => {
                                if (!overridePermission) return
                                updateOverrides(
                                  [overridePermission],
                                  overrideEffect
                                )
                                setOverridePermission('')
                              }}
                            >
                              Apply
                            </Button>
                          </div>
                        </div>

                        <div className='grid gap-3 md:grid-cols-2'>
                          <div className='rounded-lg border p-4'>
                            <div className='flex items-center gap-2 text-sm font-semibold'>
                              <Shield className='h-4 w-4 text-emerald-600' />
                              Allow Overrides
                            </div>
                            <div className='mt-3 space-y-2'>
                              {userOverrides.allow.length ? (
                                userOverrides.allow.map((code) => (
                                  <div
                                    key={code}
                                    className='flex items-center justify-between rounded-md border px-3 py-2 text-xs'
                                  >
                                    <span>
                                      {permissionIndex.byCode[code]?.title ??
                                        code}
                                    </span>
                                    <Button
                                      size='sm'
                                      variant='ghost'
                                      onClick={() =>
                                        updateOverrides([code], 'CLEAR')
                                      }
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ))
                              ) : (
                                <div className='text-muted-foreground text-sm'>
                                  No allow overrides added.
                                </div>
                              )}
                            </div>
                          </div>
                          <div className='rounded-lg border p-4'>
                            <div className='flex items-center gap-2 text-sm font-semibold'>
                              <ShieldAlert className='h-4 w-4 text-rose-600' />
                              Deny Overrides
                            </div>
                            <div className='mt-3 space-y-2'>
                              {userOverrides.deny.length ? (
                                userOverrides.deny.map((code) => (
                                  <div
                                    key={code}
                                    className='flex items-center justify-between rounded-md border px-3 py-2 text-xs'
                                  >
                                    <span>
                                      {permissionIndex.byCode[code]?.title ??
                                        code}
                                    </span>
                                    <Button
                                      size='sm'
                                      variant='ghost'
                                      onClick={() =>
                                        updateOverrides([code], 'CLEAR')
                                      }
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ))
                              ) : (
                                <div className='text-muted-foreground text-sm'>
                                  No deny overrides added.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className={cardGapClass}>
                      <CardHeader className='space-y-1'>
                        <CardTitle>Audit Readiness</CardTitle>
                        <p className='text-muted-foreground text-sm'>
                          Track override impact on effective access.
                        </p>
                      </CardHeader>
                      <CardContent className='space-y-3'>
                        <div className='rounded-lg border px-3 py-3 text-sm'>
                          <div className='flex items-center gap-2'>
                            <CheckCircle2 className='h-4 w-4 text-emerald-600' />
                            <span className='font-medium'>
                              Effective access
                            </span>
                          </div>
                          <div className='text-muted-foreground mt-2 text-xs'>
                            {permissionSummary.allowed} permissions are active
                            for this user.
                          </div>
                        </div>
                        <div className='rounded-lg border px-3 py-3 text-sm'>
                          <div className='flex items-center gap-2'>
                            <ShieldAlert className='h-4 w-4 text-rose-600' />
                            <span className='font-medium'>
                              Overrides applied
                            </span>
                          </div>
                          <div className='text-muted-foreground mt-2 text-xs'>
                            {permissionSummary.overrides} custom rules are
                            impacting access.
                          </div>
                        </div>
                        <div className='rounded-lg border px-3 py-3 text-sm'>
                          <div className='flex items-center gap-2'>
                            <Users className='text-muted-foreground h-4 w-4' />
                            <span className='font-medium'>Last change</span>
                          </div>
                          <div className='text-muted-foreground mt-2 text-xs'>
                            Changes are staged locally and not yet published.
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card className={cardGapClass}>
              <CardContent className='py-8'>
                <Alert variant='info'>
                  <Info />
                  <AlertTitle>No user selected</AlertTitle>
                  <AlertDescription>
                    Choose a user from the left panel to view access settings.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Main>
  )
}
