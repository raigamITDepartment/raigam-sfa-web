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

const DEMARCATION_STORAGE_KEY = 'demarcation-active-tab'
const DEFAULT_DEMARCATION_TAB = 'channel'

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
          defaultValue={DEFAULT_DEMARCATION_TAB}
          storageKey={DEMARCATION_STORAGE_KEY}
          listClassName='rounded-lg border bg-white px-2 py-1 shadow-sm dark:bg-slate-900'
          triggerClassName='rounded-md px-3 py-1.5 text-sm font-semibold text-slate-700 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 dark:text-slate-200 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-50'
          contentClassName='mt-4'
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
