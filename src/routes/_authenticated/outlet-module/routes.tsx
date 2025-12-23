import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { OutletList } from '@/components/outlet-module/OutletList'

export const Route = createFileRoute('/_authenticated/outlet-module/routes')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Main>
      <PageHeader
        title='Outlets'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Outlet Module' },
          { label: 'Outlets' },
        ]}
      />
      <div className='mt-4'>Routes</div>
    </Main>
  )
}
