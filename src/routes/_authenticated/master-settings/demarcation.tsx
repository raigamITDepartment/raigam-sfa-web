import { createFileRoute } from '@tanstack/react-router'
import { CommonTabs } from '@/components/common-tabs'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import {
  Channel,
  SubChannel,
  Region,
  Area,
  AreaRegionMapping,
  Territory,
  RouteComponent,
  Agency,
} from '@/components/demarcation'

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
      <div className='mt-4'>
        <CommonTabs
          defaultValue='channel'
          items={[
            {
              value: 'channel',
              label: 'Channel',
              content: <Channel />,
            },
            {
              value: 'sub-channel',
              label: 'Sub Channel',
              content: <SubChannel />,
            },
            {
              value: 'region',
              label: 'Region',
              content: <Region />,
            },
            {
              value: 'area',
              label: 'Area',
              content: <Area />,
            },
            {
              value: 'area-region-mapping',
              label: 'Area Region Mapping',
              content: <AreaRegionMapping />,
            },
            {
              value: 'territory',
              label: 'Territory',
              content: <Territory />,
            },
            {
              value: 'route',
              label: 'Route',
              content: <RouteComponent />,
            },
            {
              value: 'agency',
              label: 'Agency',
              content: <Agency />,
            },
          ]}
        />
      </div>
    </Main>
  ),
})
