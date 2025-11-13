import { createFileRoute } from '@tanstack/react-router'
import { Card } from '@/components/ui/card'
import { CommonTabs } from '@/components/common-tabs'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute(
  '/_authenticated/master-settings/demarcation'
)({
  component: () => (
    <Main>
      <PageHeader
        title='Demarcation'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Master Settings' },
          { label: 'Demarcation' },
        ]}
      />
      <Card className='mt-4 p-4'>
        <CommonTabs
          defaultValue='channel-creation'
          items={[
            {
              value: 'channel-creation',
              label: 'Channel Creation',
              content: <div>Route Creation</div>,
            },
            {
              value: 'sub-channel-creation',
              label: 'Sub-Channel Creation',
              content: <div>Sub-Channel Creation</div>,
            },
            {
              value: 'region-creation',
              label: 'Region Creation',
              content: <div>Region Creation</div>,
            },
            {
              value: 'area-creation',
              label: 'Area Creation',
              content: <div>Area Creation</div>,
            },
            {
              value: 'area-region-mapping',
              label: 'Area Region Mapping',
              content: <div>Area Region Mapping</div>,
            },
            {
              value: 'territory-creation',
              label: 'Territory Creation',
              content: <div>Territory Creation</div>,
            },
            {
              value: 'route-creation',
              label: 'Route Creation',
              content: <div>Route Creation</div>,
            },
            {
              value: 'agency-creation',
              label: 'Agency Creation',
              content: <div>Agency Creation</div>,
            },
          ]}
        />
      </Card>
    </Main>
  ),
})
