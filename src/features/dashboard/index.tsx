import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { OverviewByUserGroup } from '@/components/overviews/OverviewByUserGroup'

export function Dashboard() {
  return (
    <>
      {/* ===== Main ===== */}
      <Main>
        <PageHeader
          title='Dashboard'
          breadcrumbs={[
            { label: 'Home', to: '/dashboard/overview' },
            { label: 'Dashboards' },
            { label: 'Overview' },
          ]}
        />
        <OverviewByUserGroup />
      </Main>
    </>
  )
}

// Top navigation removed per request
