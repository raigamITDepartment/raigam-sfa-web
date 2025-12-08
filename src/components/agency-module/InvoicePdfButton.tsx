import { useState } from 'react'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/format-price'
import type { BookingInvoiceReportItem } from '@/types/invoice'

type InvoicePdfButtonProps = {
  invoice: BookingInvoiceReportItem
  extraDetails?: unknown
  label?: string
  size?: 'sm' | 'default'
}

// --------------------- Helper Functions ---------------------
const formatDate = (value?: string) => {
  if (!value || value === '0001-01-01') return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString()
}

const deriveStatus = (row: BookingInvoiceReportItem) => {
  if (row.isReversed) return 'Reversed'
  if (row.isLateDelivery) return 'Late Delivery'
  if (row.isActual) return 'Actual'
  if (row.isBook) return 'Booked'
  return 'Pending'
}

const asText = (value: unknown) => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

// --------------------- React Button ---------------------
export function InvoicePdfButton({
  invoice,
  extraDetails,
  label = 'Download PDF',
  size = 'default',
}: InvoicePdfButtonProps) {
  const [isBuilding, setIsBuilding] = useState(false)

  const handleDownload = async () => {
    try {
      setIsBuilding(true)
      const pdfBytes = await createInvoicePdf(invoice, extraDetails)
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoice.invoiceNo}.pdf`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } finally {
      setIsBuilding(false)
    }
  }

  return (
    <Button
      size={size}
      variant='outline'
      onClick={handleDownload}
      disabled={isBuilding}
    >
      {isBuilding ? 'Building PDF...' : label}
    </Button>
  )
}

export default InvoicePdfButton

// --------------------- PDF LIB LOADER ---------------------
const loadPdfLib = async () => {
  return { PDFDocument, StandardFonts, rgb }
}

// --------------------- Single Invoice PDF ---------------------
export async function createInvoicePdf(
  invoice: BookingInvoiceReportItem,
  extraDetails?: unknown
) {
  const lib = await loadPdfLib()
  const pdfDoc = await lib.PDFDocument.create()
  const fontBold = await pdfDoc.embedFont(lib.StandardFonts.HelveticaBold)
  const font = await pdfDoc.embedFont(lib.StandardFonts.Helvetica)
  await renderInvoiceIntoDoc(pdfDoc, lib, invoice, extraDetails, font, fontBold)
  return pdfDoc.save()
}

// --------------------- Combined Invoices PDF ---------------------
export async function createCombinedInvoicesPdf(
  invoices: BookingInvoiceReportItem[],
  extras: Record<string, unknown>
) {
  const lib = await loadPdfLib()
  const combined = await lib.PDFDocument.create()

  for (const invoice of invoices) {
    const key = String(invoice.id ?? invoice.invoiceNo)
    const extra = extras[key]

    // Create independent single invoice doc
    const singleDoc = await lib.PDFDocument.create()
    const fontBold = await singleDoc.embedFont(lib.StandardFonts.HelveticaBold)
    const font = await singleDoc.embedFont(lib.StandardFonts.Helvetica)

    await renderInvoiceIntoDoc(singleDoc, lib, invoice, extra, font, fontBold)

    // Copy pages from this invoice doc into combined one
    const pages = await combined.copyPages(
      singleDoc,
      singleDoc.getPageIndices()
    )
    pages.forEach((p) => combined.addPage(p))
  }

  return combined.save()
}

// --------------------- Render Invoice Layout ---------------------
async function renderInvoiceIntoDoc(
  pdfDoc: any,
  lib: typeof import('pdf-lib'),
  invoice: BookingInvoiceReportItem,
  extraDetails: unknown,
  font: any,
  fontBold: any
) {
  const { rgb } = lib
  const margin = 40
  let page = pdfDoc.addPage([595.28, 841.89]) // A4
  let { height, width } = page.getSize()
  const contentWidth = width - margin * 2
  let y = height - margin

  const newPage = (withHeader = false) => {
    page = pdfDoc.addPage([595.28, 841.89])
    height = page.getSize().height
    y = height - margin
    if (withHeader) drawRow(headers, true)
  }

  const drawText = (
    text: string,
    opts?: { x?: number; size?: number; color?: any }
  ) => {
    const size = opts?.size ?? 12
    if (y < margin + size + 20) newPage()
    page.drawText(text, {
      x: opts?.x ?? margin,
      y,
      size,
      font,
      color: opts?.color ?? rgb(0, 0, 0),
    })
    y -= size + 6
  }

  const drawTitle = (text: string) => {
    const size = 18
    if (y < margin + size + 20) newPage()
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: fontBold,
      color: rgb(0, 0.2, 0.5),
    })
    y -= size + 10
  }

  // Header
  drawTitle('Booking Invoice')
  drawText(`Invoice ID: ${invoice.invoiceNo}`, { size: 13 })
  drawText(`Status: ${deriveStatus(invoice)}`)
  drawText(`Invoice Type: ${invoice.invoiceType ?? '-'}`)
  drawText(`Booking Date: ${formatDate(invoice.dateBook)}`)
  drawText(
    `Outlet: ${invoice.outletName ?? '-'} (Route: ${invoice.routeName ?? '-'})`
  )
  drawText(`Territory: ${invoice.territoryId ?? '-'}`)
  drawText(`Source: ${invoice.sourceApp ?? '-'}`)
  drawText(
    `Totals: ${formatPrice(invoice.totalBookFinalValue ?? 0)} (Discount ${formatPrice(
      invoice.totalDiscountValue ?? 0
    )})`
  )

  y -= 8
  drawTitle('Items')

  const items = invoice.invoiceDetailDTOList ?? []
  const headers = ['Item', 'Qty', 'Unit', 'Discount', 'Final']
  const colWidths = [0.35, 0.15, 0.15, 0.15, 0.2].map((p) => p * contentWidth)

  const drawRow = (values: string[], isHeader = false) => {
    if (y < margin + 40) newPage(isHeader)
    values.forEach((text, idx) => {
      page.drawText(text, {
        x: margin + colWidths.slice(0, idx).reduce((a, b) => a + b, 0),
        y,
        size: isHeader ? 11 : 10,
        font: isHeader ? fontBold : font,
      })
    })
    y -= isHeader ? 18 : 16
  }

  if (!items.length) {
    drawText('No items available.')
  } else {
    drawRow(headers, true)
    items.forEach((item, index) => {
      const qty = Math.max(
        (item.totalBookQty ?? 0) - (item.totalCancelQty ?? 0),
        0
      )
      drawRow([
        item.itemName ?? 'Item',
        qty.toString(),
        formatPrice(item.sellUnitPrice ?? 0),
        `${item.bookDiscountPercentage ?? item.discountPercentage ?? 0}%`,
        formatPrice(item.finalTotalValue ?? item.totalBookSellValue ?? 0),
      ])
    })
  }

  y -= 8
  drawTitle('Extra Print Details')

  const extraText = asText(extraDetails).replace(/\s+/g, ' ').trim()
  const wrapText = (text: string, maxWidth: number) => {
    const words = text.split(/\s+/)
    let line = ''
    const lines: string[] = []
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(test, 10) > maxWidth) {
        if (line) lines.push(line)
        line = word
      } else {
        line = test
      }
    })
    if (line) lines.push(line)
    return lines
  }

  wrapText(extraText, contentWidth).forEach((line) => {
    drawText(line, { size: 10 })
  })
}
