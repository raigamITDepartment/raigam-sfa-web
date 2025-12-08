import type { BookingInvoiceReportItem } from '@/types/invoice'
import { cn } from '@/lib/utils'
import InvoiceNumber from '@/components/InvoiceNumber'
import { formatPrice } from '@/lib/format-price'

interface BookingInvoiceDetailsHeaderProps {
  invoice: BookingInvoiceReportItem
  status: string
  formatDate: (value?: string) => string
}

export function BookingInvoiceDetailsHeader({
  invoice,
  status,
  formatDate,
}: BookingInvoiceDetailsHeaderProps) {
  const territoryCode =
    (invoice as { territoryCode?: string | null }).territoryCode ??
    (invoice.territoryId ? String(invoice.territoryId) : '-')

  const allItems = [
    { label: 'Bill Type', value: invoice.invoiceType ?? '-' },
    { label: 'Shop Name', value: invoice.outletName ?? '-' },
    {
      label: 'Shop Code',
      value: invoice.outletId ? String(invoice.outletId) : '-',
    },
    { label: 'Route', value: invoice.routeName ?? '-' },
    { label: 'Territory Code', value: territoryCode },
    { label: 'Booking Date', value: formatDate(invoice.dateBook) },
    { label: 'Actual Date', value: formatDate(invoice.dateActual) },
    {
      label: 'Booking Value',
      value: formatPrice(invoice.totalBookValue),
    },
    {
      label: 'Discount Value',
      value: formatPrice(invoice.totalDiscountValue),
    },
    { label: 'Source', value: invoice.sourceApp ?? '-' },
  ]

  return (
    <div className='rounded-md border border-slate-200/70 bg-white px-4 py-4 text-slate-900 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-100'>
      <div className='flex flex-wrap gap-x-8 gap-y-4'>
        <div className='flex flex-col gap-2'>
          <p className='text-[11px] tracking-[0.35em] text-slate-500 uppercase dark:text-slate-400'>
            Invoice No
          </p>
          <InvoiceNumber
            invoiceId={invoice.invoiceNo}
            className='text-2xl font-semibold text-slate-900 dark:text-white'
          />
          <div
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-3 py-1 text-[11px] font-semibold tracking-[0.2em] uppercase',
              {
                'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100':
                  status === 'Booked',
                'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100':
                  status === 'Actual',
                'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100':
                  status === 'Late Delivery',
                'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100':
                  status === 'Reversed',
                'border-slate-200 bg-white/70 text-slate-800 dark:border-slate-600 dark:bg-white/10 dark:text-white':
                  status === 'Pending',
              }
            )}
          >
            <span className='size-2 rounded-full bg-current' />
            {status}
          </div>
        </div>
        <div className='flex flex-1 flex-wrap gap-x-8 gap-y-4 text-sm'>
          {allItems.map((item) => (
            <div key={item.label} className='min-w-[140px]'>
              <p className='text-[10px] tracking-[0.25em] text-slate-500 uppercase dark:text-slate-400'>
                {item.label}
              </p>
              <p className='mt-1 text-base font-semibold text-slate-900 dark:text-white'>
                {item.value ?? '-'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BookingInvoiceDetailsHeader
