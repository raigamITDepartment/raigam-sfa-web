import type {
  BookingInvoiceDetailDTO,
  BookingInvoiceReportItem,
} from '@/types/invoice'
import BookingInvoiceItemsTable, {
  type ManualSavePayload,
} from './booking-invoice-items-table'

type ManualInvoiceItemsTableProps = {
  invoice: BookingInvoiceReportItem
  items: BookingInvoiceDetailDTO[]
  userId?: number | null
  onCancel?: () => void
  onManualSave?: (payload: ManualSavePayload) => void | Promise<void>
}

/**
 * Thin wrapper that renders the standard booking invoice table
 * in "manual" mode. Keeps the familiar layout from invoice view/update
 * while isolating manual-create specific behaviour.
 */
const ManualInvoiceItemsTable = ({
  invoice,
  items,
  userId,
  onCancel,
  onManualSave,
}: ManualInvoiceItemsTableProps) => {
  return (
    <BookingInvoiceItemsTable
      invoice={invoice}
      items={items}
      userId={userId}
      onCancel={onCancel}
      onManualSave={onManualSave}
      mode='manual'
    />
  )
}

export type { ManualSavePayload }
export default ManualInvoiceItemsTable
