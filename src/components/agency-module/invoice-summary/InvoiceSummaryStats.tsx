import { useEffect, useMemo, useRef, useState } from 'react'
import type { BookingInvoice } from '@/types/invoice'
import { formatPrice } from '@/lib/format-price'

type InvoiceSummaryStatsProps = {
  rows: BookingInvoice[]
}

type SummaryItem = {
  label: string
  value: number
  decimals: number
  className: string
  format: (value: number) => string
}

const toAmount = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0

const useCountUp = (
  target: number,
  {
    durationMs = 900,
    decimals = 0,
  }: { durationMs?: number; decimals?: number } = {}
) => {
  const [displayValue, setDisplayValue] = useState(target)
  const previous = useRef(target)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    const from = previous.current
    const to = target
    previous.current = target

    if (frame.current !== null) {
      cancelAnimationFrame(frame.current)
    }

    if (from === to) {
      setDisplayValue(to)
      return undefined
    }

    const start = performance.now()
    const diff = to - from
    const factor = Math.pow(10, decimals)

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + diff * eased
      const rounded = Math.round(current * factor) / factor
      setDisplayValue(rounded)

      if (progress < 1) {
        frame.current = requestAnimationFrame(tick)
      }
    }

    frame.current = requestAnimationFrame(tick)

    return () => {
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current)
      }
    }
  }, [decimals, durationMs, target])

  return displayValue
}

const SummaryStatCard = ({ item }: { item: SummaryItem }) => {
  const animatedValue = useCountUp(item.value, {
    durationMs: 900,
    decimals: item.decimals,
  })

  return (
    <div
      className={`rounded-xl border px-4 py-3 shadow-sm ${item.className}`}
    >
      <p className='text-sm font-medium text-slate-600 dark:text-slate-200'>
        {item.label}
      </p>
      <p className='mt-2 text-2xl font-semibold tracking-tight'>
        {item.format(animatedValue)}
      </p>
    </div>
  )
}

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

  const items: SummaryItem[] = [
    {
      label: 'Total Invoice Count',
      value: summary.totalInvoiceCount,
      decimals: 0,
      format: (value: number) => String(Math.round(value)),
      className:
        'border-slate-200/70 bg-slate-50/70 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-200',
    },
    {
      label: 'Total Booking Count',
      value: summary.bookingCount,
      decimals: 0,
      format: (value: number) => String(Math.round(value)),
      className:
        'border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
    },
    {
      label: 'Total Booking Value',
      value: summary.bookingValueTotal,
      decimals: 2,
      format: (value: number) => formatPrice(value),
      className:
        'border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
    },
    {
      label: 'Total Actual Count',
      value: summary.actualCount,
      decimals: 0,
      format: (value: number) => String(Math.round(value)),
      className:
        'border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
    },
    {
      label: 'Total Actual Value',
      value: summary.actualValueTotal,
      decimals: 2,
      format: (value: number) => formatPrice(value),
      className:
        'border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
    },
    {
      label: 'Late Delivery Count',
      value: summary.lateDeliveryCount,
      decimals: 0,
      format: (value: number) => String(Math.round(value)),
      className:
        'border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    },
  ]

  return (
    <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
      {items.map((item) => (
        <SummaryStatCard key={item.label} item={item} />
      ))}
    </div>
  )
}
