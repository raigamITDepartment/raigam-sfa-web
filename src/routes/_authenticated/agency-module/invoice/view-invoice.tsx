import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId } from '@/lib/authz'
import ActualInvoice from '@/components/agency-module/actual-invoice'
import BookingInvoice from '@/components/agency-module/booking-invoice'
import CanceledInvoice from '@/components/agency-module/canceled-invoice'
import LateDeliveryInvoice from '@/components/agency-module/late-delivery-invoice'
import CommonTabs from '@/components/common-tabs'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

export const Route = createFileRoute(
  '/_authenticated/agency-module/invoice/view-invoice'
)({
  beforeLoad: () =>
    ensureRoleAccess([RoleId.SystemAdmin, RoleId.OperationSales]),
  component: () => (
    <Main>
      <PageHeader
        title='View Invoice'
        breadcrumbs={[
          { label: 'Home', to: '/dashboard/overview' },
          { label: 'Agency Module' },
          { label: 'Invoice' },
          { label: 'View Invoice' },
        ]}
      />
      <div className='mt-4'>
        <div className='space-y-4'>
          <CommonTabs
            storageKey='view-invoice-tab'
            defaultValue='booking'
            items={[
              {
                value: 'booking',
                label: 'Booking Invoice',
                content: <BookingInvoice />,
              },
              {
                value: 'actual',
                label: 'Actual Invoice',
                content: <ActualInvoice />,
              },
              {
                value: 'late-delivery',
                label: 'Late Delivery Invoice',
                content: <LateDeliveryInvoice />,
              },
              {
                value: 'canceled',
                label: 'Canceled Invoice',
                content: <CanceledInvoice />,
              },
            ]}
          />
        </div>
      </div>
    </Main>
  ),
})
