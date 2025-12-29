import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ensureRoleAccess, RoleId, SubRoleId } from '@/lib/authz'
import ActualInvoice from '@/components/agency-module/actual-invoice'
import BookingInvoice from '@/components/agency-module/booking-invoice'
import CanceledInvoice from '@/components/agency-module/canceled-invoice'
import LateDeliveryInvoice from '@/components/agency-module/late-delivery-invoice'
import CommonTabs from '@/components/common-tabs'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'

const TAB_STORAGE_KEY = 'view-invoice-tab'

const TAB_QUERY_KEYS: Record<string, string | null> = {
  booking: 'booking-invoices',
  actual: 'actual-invoices',
  'late-delivery': 'late-delivery-invoices',
  canceled: 'canceled-invoices',
}

const ViewInvoicePage = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'booking'
    return window.localStorage.getItem(TAB_STORAGE_KEY) ?? 'booking'
  })

  const refetchTabQueries = useCallback(
    async (tabValue: string) => {
      const queryKey = TAB_QUERY_KEYS[tabValue]
      if (!queryKey) return
      await queryClient.invalidateQueries({ queryKey: [queryKey] })
      await queryClient.refetchQueries({ queryKey: [queryKey], type: 'active' })
    },
    [queryClient]
  )

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value)
      refetchTabQueries(value)
    },
    [refetchTabQueries]
  )

  const tabItems = useMemo(
    () => [
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
    ],
    []
  )

  return (
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
            storageKey={TAB_STORAGE_KEY}
            value={activeTab}
            onValueChange={handleTabChange}
            defaultValue='booking'
            items={tabItems}
          />
        </div>
      </div>
    </Main>
  )
}

export const Route = createFileRoute(
  '/_authenticated/agency-module/invoice/view-invoice'
)({
  beforeLoad: () =>
    ensureRoleAccess([
      RoleId.SystemAdmin,
      RoleId.OperationSales,
      SubRoleId.AreaSalesManager,
      SubRoleId.AreaSalesExecutive,
    ]),
  component: ViewInvoicePage,
})
