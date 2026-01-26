import { RoleId } from '@/lib/authz'
import { useAppSelector } from '@/store/hooks'
import { BaseOverview } from './BaseOverview'
import { ExecutiveCompanyOverview } from './ExecutiveCompanyOverview'
import { ExecutiveSalesOverview } from './ExecutiveSalesOverview'
import { ManagerSalesOverview } from './ManagerSalesOverview'
import { OperationSalesOverview } from './OperationSalesOverview'
import { SeniorManagerSalesOverview } from './SeniorManagerSalesOverview'
import { SystemAdminOverview } from './SystemAdminOverview'
import { TopManagementOverview } from './TopManagementOverview'

export function OverviewByUserGroup() {
  const user = useAppSelector((state) => state.auth.user)
  const rawGroupId = user?.userGroupId
  const parsedGroupId = rawGroupId != null ? Number(rawGroupId) : NaN
  const groupId = Number.isFinite(parsedGroupId) ? parsedGroupId : undefined

  switch (groupId) {
    case RoleId.SystemAdmin:
      return <SystemAdminOverview />
    case RoleId.TopManager:
      return <TopManagementOverview />
    case RoleId.SeniorManagerSales:
      return <SeniorManagerSalesOverview />
    case RoleId.ManagerSales:
      return <ManagerSalesOverview />
    case RoleId.ExecutiveSales:
      return <ExecutiveSalesOverview />
    case RoleId.ExecutiveCompany:
      return <ExecutiveCompanyOverview />
    case RoleId.OperationSales:
      return <OperationSalesOverview />
    default:
      return <BaseOverview />
  }
}
