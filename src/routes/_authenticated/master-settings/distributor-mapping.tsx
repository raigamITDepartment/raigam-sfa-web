import { createFileRoute } from '@tanstack/react-router'
import { CommonTabs } from '@/components/common-tabs'
import AgencyMapping from '@/components/distributor-mapping/agency-mapping'
import DistributorCreation from '@/components/distributor-mapping/distributor-creation'
import WarehouseMapping from '@/components/distributor-mapping/warehouse-mapping'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

const DISTRIBUTOR_MAPPING_STORAGE_KEY = 'distributor-mapping-active-tab'
const DEFAULT_DISTRIBUTOR_MAPPING_TAB = 'distributor-creation'

export const Route = createFileRoute(
  '/_authenticated/master-settings/distributor-mapping'
)({
  component: () => (
    <Main>
      <PageHeader
        title='Distributor Mapping'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Master Settings' },
          { label: 'Distributor Mapping' },
        ]}
      />
      <div className='mt-4'>
        <CommonTabs
          defaultValue={DEFAULT_DISTRIBUTOR_MAPPING_TAB}
          storageKey={DISTRIBUTOR_MAPPING_STORAGE_KEY}
          items={[
            {
              value: 'distributor-creation',
              label: 'Distributor Creation',
              content: <DistributorCreation />,
            },
            {
              value: 'agency-mapping',
              label: 'Agency Mapping',
              content: <AgencyMapping />,
            },
            {
              value: 'warehouse-mapping',
              label: 'Warehouse Mapping',
              content: <WarehouseMapping />,
            },
          ]}
        />
      </div>
    </Main>
  ),
})
