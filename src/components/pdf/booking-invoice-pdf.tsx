import { useMemo, useState } from 'react'
import { getInvoicePrintData } from '@/services/sales/invoice/invoiceApi'
import type {
  BookingInvoiceReportItem,
  InvoicePrintData,
} from '@/types/invoice'
import { Printer } from 'lucide-react'
import { rgb } from 'pdf-lib'
import logoUrl from '@/assets/logo.png'
import { Button } from '@/components/ui/button'
import PdfPrint from './pdf-print'

type BookingInvoicePdfProps = {
  rows: BookingInvoiceReportItem[]
  filename?: string
  disabled?: boolean
  label?: string
  logoDataUrl?: string
  detailsByInvoiceNo?: Record<string, InvoicePrintData>
}

let defaultLogoPromise: Promise<Uint8Array> | null = null

const formatDate = (value?: string) => {
  if (!value || value === '0001-01-01') return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

const deriveStatus = (row: BookingInvoiceReportItem) => {
  if (row.isReversed) return 'Reversed'
  if (row.isLateDelivery) return 'Late Delivery'
  if (row.isActual) return 'Actual'
  if (row.isBook) return 'Booked'
  return 'Pending'
}

const formatInvoiceNumber = (invoiceId: string) => {
  if (!invoiceId || invoiceId.length < 3) return invoiceId || 'Invalid ID'
  const prefix = invoiceId.slice(0, 2)
  const numericPart = invoiceId.slice(2)
  const numericValue = numericPart.replace(/^0+/, '') || '0'
  const displayPart =
    numericValue.length > 8 ? numericValue : numericValue.padStart(8, '0')
  return `${prefix}${displayPart}`
}

export function BookingInvoicePdfButton({
  rows,
  filename = 'booking-invoices.pdf',
  disabled,
  label = 'Print Selected Invoice',
  logoDataUrl,
  detailsByInvoiceNo,
}: BookingInvoicePdfProps) {
  const count = rows.length
  const today = new Date()
  const formattedTime = today.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
  const formattedDate = today.toISOString().slice(0, 10)
  const [detailsMap, setDetailsMap] = useState<
    Record<string, InvoicePrintData>
  >({})
  const resolvedDetails = useMemo(
    () => ({ ...(detailsByInvoiceNo ?? {}), ...detailsMap }),
    [detailsByInvoiceNo, detailsMap]
  )

  return (
    <PdfPrint
      autoPrint
      filename={filename}
      build={async ({ doc, addPage, font }) => {
        let page = addPage()
        const margin = 40
        let { width, height } = page.getSize()
        let y = height - margin
        const lineHeight = 14
        const white = rgb(1, 1, 1)

        const dataUrlToUint8 = (dataUrl: string) => {
          const base64 = dataUrl.split(',')[1] ?? ''
          const binary = atob(base64)
          const len = binary.length
          const bytes = new Uint8Array(len)
          for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i)
          }
          return bytes
        }

        const fetchImageBytes = async (url: string) => {
          const res = await fetch(url)
          const buf = await res.arrayBuffer()
          return new Uint8Array(buf)
        }

        const drawLogo = async (
          targetX: number,
          targetY: number,
          containerHeight: number
        ) => {
          let bytes: Uint8Array | undefined
          if (logoDataUrl) {
            bytes = dataUrlToUint8(logoDataUrl)
          } else {
            defaultLogoPromise ||= fetchImageBytes(logoUrl)
            bytes = await defaultLogoPromise
          }

          try {
            // Try PNG first; fallback to JPG if needed
            let img
            try {
              img = await doc.embedPng(bytes)
            } catch {
              img = await doc.embedJpg(bytes)
            }
            const logoMaxWidth = 140
            const scale = logoMaxWidth / img.width
            const logoHeight = img.height * scale
            const centeredY = targetY + (containerHeight - logoHeight) / 2
            page.drawImage(img, {
              x: targetX,
              y: centeredY,
              width: logoMaxWidth,
              height: logoHeight,
            })
            return logoHeight
          } catch {
            const fallbackHeight = 20
            const centeredY = targetY + (containerHeight - fallbackHeight) / 2
            page.drawText('Raigam', {
              x: targetX,
              y: centeredY,
              size: 14,
              font,
              color: white,
            })
            return fallbackHeight
          }
        }

        const drawText = (
          text: string,
          x: number,
          size = 10,
          opts?: { yOffset?: number; color?: any }
        ) => {
          if (opts?.yOffset) y += opts.yOffset
          page.drawText(text, {
            x,
            y,
            size,
            font,
            color: opts?.color,
          })
          y -= size + 3
        }

        const tableHeader = [
          { label: 'Item Description', width: 200 },
          { label: 'Qty', width: 50 },
          { label: 'WS Price', width: 80 },
          { label: 'Discount', width: 70 },
          { label: 'Value', width: 80 },
        ]

        const drawHeader = async (row: BookingInvoiceReportItem) => {
          const invoiceNo = row.invoiceNo
          const extra = resolvedDetails?.[invoiceNo]
          const bannerHeight = 94 // adds ~10px padding
          const bannerY = height - bannerHeight

          // Gray banner background
          page.drawRectangle({
            x: 0,
            y: bannerY,
            width,
            height: bannerHeight,
            color: rgb(64 / 255, 60 / 255, 60 / 255),
          })

          // Logo on the left
          const logoHeight = await drawLogo(margin, bannerY, bannerHeight)
          const textBlockHeight = 46 // approx height of title + 3 info lines
          const textTop =
            bannerY + bannerHeight - (bannerHeight - textBlockHeight) / 2
          const textX = margin + 170

          page.drawText('INVOICE', {
            x: textX,
            y: textTop,
            size: 20,
            font,
            color: white,
          })

          page.drawText('Raigam Marketing Services', {
            x: textX,
            y: textTop - 18,
            size: 11,
            font,
            color: white,
          })

          page.drawText('No. 277, Kiriwattuduwa, Homagama', {
            x: textX,
            y: textTop - 32,
            size: 11,
            font,
            color: white,
          })

          page.drawText('Tel: 0112753350 | Fax: 0112753350', {
            x: textX,
            y: textTop - 46,
            size: 11,
            font,
            color: white,
          })

          // Move below banner with bottom spacing
          y = bannerY - 20

          const leftX = margin
          const rightX = width / 2 + 20

          drawText(`Dealer Code : ${extra?.shopCode ?? ''}`, leftX)
          drawText(`Dealer Name : ${row.outletName ?? ''}`, leftX)
          drawText(
            `Address : ${[extra?.address1, extra?.address2, extra?.address3].filter(Boolean).join(', ')}`,
            leftX
          )
          drawText(`Territory : ${extra?.territoryCode ?? ''}`, leftX)

          y = bannerY - 20
          drawText(`Invoice No : ${formatInvoiceNumber(invoiceNo)}`, rightX)
          drawText(`Invoice Date : ${formattedDate}`, rightX)
          drawText(`Time : ${extra?.orderTime ?? formattedTime}`, rightX)
          drawText(`Route Code : ${extra?.routeCode ?? ''}`, rightX)

          y -= 8
          // Separator line
          page.drawLine({
            start: { x: margin, y },
            end: { x: width - margin, y },
            thickness: 1,
          })
          y -= 14

          // Table header
          let x = margin
          tableHeader.forEach((col) => {
            page.drawText(col.label, { x, y, size: 10, font })
            x += col.width
          })
          y -= 10
          page.drawLine({
            start: { x: margin, y },
            end: { x: width - margin, y },
            thickness: 0.8,
          })
          y -= 10
        }

        const drawTableRow = (
          desc: string,
          qty: string,
          price: string,
          discount: string,
          value: string
        ) => {
          let x = margin
          const cells = [desc, qty, price, discount, value]
          tableHeader.forEach((col, idx) => {
            page.drawText(cells[idx], { x, y, size: 10, font })
            x += col.width
          })
          y -= lineHeight
        }

        const drawTotals = (
          gross: number,
          lineDisc: number,
          valDisc: number,
          invoiceVal: number
        ) => {
          y -= 6
          page.drawLine({
            start: { x: width / 2, y },
            end: { x: width - margin, y },
            thickness: 0.8,
          })
          y -= 12

          const labelX = width / 2 + 10
          const valX = width - margin - 60
          const writeRow = (label: string, val: string) => {
            page.drawText(label, { x: labelX, y, size: 10, font })
            page.drawText(val, { x: valX, y, size: 10, font })
            y -= 12
          }
          writeRow('Gross Value :', gross.toFixed(2))
          writeRow('Line Discount :', lineDisc.toFixed(2))
          writeRow('Value Discount :', valDisc.toFixed(2))

          y -= 6
          page.drawLine({
            start: { x: width / 2, y },
            end: { x: width - margin, y },
            thickness: 0.8,
          })
          y -= 12
          writeRow('Invoice Value :', invoiceVal.toFixed(2))
        }

        const drawFooter = () => {
          y -= 18
          page.drawLine({
            start: { x: margin, y },
            end: { x: width - margin, y },
            thickness: 0.8,
          })
          y -= 18
          page.drawText('Mode of payment :', { x: margin, y, size: 10, font })
          y -= 14
          page.drawText('Received in good condition and order', {
            x: margin,
            y,
            size: 10,
            font,
          })
          y -= 14
          page.drawText('Customer Signature', { x: margin, y, size: 10, font })
          page.drawText('Date', { x: margin + 180, y, size: 10, font })
          y -= 28
          page.drawText('____________________', {
            x: margin,
            y,
            size: 10,
            font,
          })
          page.drawText('____________________', {
            x: margin + 180,
            y,
            size: 10,
            font,
          })

          const rightX = width / 2 + 20
          y += 42
          page.drawText("Sales Rep's Name :", { x: rightX, y, size: 10, font })
          y -= 14
          page.drawText('Mobile :', { x: rightX, y, size: 10, font })
          y -= 14
          page.drawText('Area Manager', { x: rightX, y, size: 10, font })
          y -= 14
          page.drawText('Head Office Office :', {
            x: rightX,
            y,
            size: 10,
            font,
          })
          // Add bottom breathing room
          y -= 20
        }

        // Render per invoice
        for (let idx = 0; idx < rows.length; idx++) {
          const row = rows[idx]
          if (idx > 0) {
            page = addPage()
            ;({ width, height } = page.getSize())
            y = height - margin
          }

          await drawHeader(row)
          // Basic item rows with available data
          drawTableRow(
            `${formatInvoiceNumber(row.invoiceNo)} - ${row.outletName ?? 'Invoice'}`,
            '1',
            row.totalBookValue.toFixed(2),
            '0.00',
            row.totalBookValue.toFixed(2)
          )

          const gross = row.totalBookValue
          const lineDisc = 0
          const valDisc = row.totalDiscountValue ?? 0
          const invoiceVal = gross - valDisc
          drawTotals(gross, lineDisc, valDisc, invoiceVal)
          drawFooter()
        }
      }}
      renderTrigger={({ isLoading, print }) => {
        const handleClick = async () => {
          try {
            console.log('Selected invoice rows:', rows)
            const entries = await Promise.all(
              rows.map(async (row) => {
                if (
                  !row.territoryId ||
                  !row.routeId ||
                  !row.outletId ||
                  !row.id
                )
                  return null
                try {
                  const res = await getInvoicePrintData({
                    territoryId: row.territoryId,
                    routeId: row.routeId,
                    outletId: row.outletId,
                    invoiceId: row.id,
                  })
                  return [row.invoiceNo, res.payload] as const
                } catch (err) {
                  console.error(
                    'Failed to fetch print data for',
                    row.invoiceNo,
                    err
                  )
                  return null
                }
              })
            )
            const next: Record<string, InvoicePrintData> = {}
            entries.forEach((entry) => {
              if (entry) next[entry[0]] = entry[1]
            })
            if (Object.keys(next).length) {
              setDetailsMap(next)
              console.log('Fetched invoice print data:', next)
            }
            await print()
          } catch (err) {
            console.error('Print error', err)
          }
        }

        return (
          <Button
            variant='outline'
            size='sm'
            className='gap-2'
            onClick={handleClick}
            disabled={disabled || !count || isLoading}
          >
            <Printer className='h-4 w-4' />
            <span className='flex items-center gap-2'>
              {isLoading ? 'Preparing PDF...' : label}
              {count > 0 ? (
                <span className='rounded-full bg-blue-500 px-2 py-0.5 text-xs font-semibold text-white dark:bg-blue-600'>
                  {count}
                </span>
              ) : null}
            </span>
          </Button>
        )
      }}
    />
  )
}

export default BookingInvoicePdfButton
