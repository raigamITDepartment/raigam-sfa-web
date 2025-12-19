import { useMemo } from 'react'
import type { BookingInvoice } from '@/types/invoice'
import { formatPrice } from '@/lib/format-price'

type InvoiceSummaryStatsProps = {
  rows: BookingInvoice[]
}

const toAmount = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0

export default function InvoiceSummaryStats({
  rows,
}: InvoiceSummaryStatsProps) {
  const summary = useMemo(() => {
    let totalInvoiceCount = 0
    let bookingCount = 0
    let bookingValueTotal = 0
    let actualCount = 0
    let actualValueTotal = 0
    let lateDeliveryCount = 0

    rows.forEach((row) => {
      totalInvoiceCount += 1
      const finalValue =
        typeof row.totalBookFinalValue === 'number'
          ? row.totalBookFinalValue
          : toAmount(row.totalBookValue)
      const isBookedOnly =
        row.isBook === true &&
        row.isActual === false &&
        row.isLateDelivery === false

      if (isBookedOnly) {
        bookingCount += 1
        bookingValueTotal += finalValue
      }
      if (row.isActual === true) {
        actualCount += 1
        actualValueTotal += toAmount(row.totalActualValue)
      }
      if (row.isLateDelivery === true) {
        lateDeliveryCount += 1
      }

    })

    return {
      totalInvoiceCount,
      bookingCount,
      bookingValueTotal,
      actualCount,
      actualValueTotal,
      lateDeliveryCount,
    }
  }, [rows])

  const items = [
    {
      label: 'Total Invoice Count',
      value: String(summary.totalInvoiceCount),
      className:
        'border-slate-200/70 bg-slate-50/70 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-200',
    },
    {
      label: 'Total Booking Count',
      value: String(summary.bookingCount),
      className:
        'border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
    },
    {
      label: 'Total Booking Value',
      value: formatPrice(summary.bookingValueTotal),
      className:
        'border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
    },
    {
      label: 'Total Actual Count',
      value: String(summary.actualCount),
      className:
        'border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
    },
    {
      label: 'Total Actual Value',
      value: formatPrice(summary.actualValueTotal),
      className:
        'border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
    },
    {
      label: 'Late Delivery Count',
      value: String(summary.lateDeliveryCount),
      className:
        'border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    },
  ]

  return (
    <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-xl border px-4 py-3 shadow-sm ${item.className}`}
        >
          <p className='text-sm font-medium text-slate-600 dark:text-slate-200'>
            {item.label}
          </p>
          <p className='mt-2 text-2xl font-semibold tracking-tight'>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}
