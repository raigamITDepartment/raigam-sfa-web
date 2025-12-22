import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute('/_authenticated/outlet-module/route/')({
  component: () => (
    <Main>
      <PageHeader
        title='Route'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Outlet Module' },
          { label: 'Route' },
        ]}
      />
      <div>Outlet Module - Route</div>
    </Main>
  ),
})
