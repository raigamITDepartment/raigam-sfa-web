import { useState } from 'react'
import type { BookingInvoiceReportItem } from '@/types/invoice'
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib'
import Logo from '@/assets/logo.png'
import { formatPrice } from '@/lib/format-price'
import { Button } from '@/components/ui/button'
import InvoiceNumber, { formatInvoiceNumber } from '@/components/InvoiceNumber'

type PdfLib = Pick<
  typeof import('pdf-lib'),
  'PDFDocument' | 'StandardFonts' | 'rgb'
>

type InvoicePdfButtonProps = {
  invoice: BookingInvoiceReportItem
  extraDetails?: unknown
  label?: string
  size?: 'sm' | 'default'
}

const formatDate = (value?: string) => {
  if (!value || value === '0001-01-01') return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString()
}

const asText = (value: unknown) => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

export function InvoicePdfButton({
  invoice,
  extraDetails,
  label = 'Download PDF',
  size = 'default',
}: InvoicePdfButtonProps) {
  const [isBuilding, setIsBuilding] = useState(false)
  const displayInvoiceNumber = formatInvoiceNumber(invoice.invoiceNo)

  const handleDownload = async () => {
    try {
      setIsBuilding(true)
      const pdfBytes = await createInvoicePdf(invoice, extraDetails)
      const pdfBuffer: ArrayBuffer = new Uint8Array(pdfBytes).buffer
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${displayInvoiceNumber}.pdf`
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
      {isBuilding ? (
        'Building PDF...'
      ) : (
        <span className='flex items-center gap-2'>
          <span>{label}</span>
          <span className='text-muted-foreground text-xs'>
            <InvoiceNumber invoiceId={invoice.invoiceNo} />
          </span>
        </span>
      )}
    </Button>
  )
}

export default InvoicePdfButton

const loadPdfLib = async (): Promise<PdfLib> => {
  return { PDFDocument, StandardFonts, rgb }
}

export async function createInvoicePdf(
  invoice: BookingInvoiceReportItem,
  extraDetails?: unknown,
  logoUrl: string = Logo
) {
  const lib = await loadPdfLib()
  const pdfDoc = await lib.PDFDocument.create()
  const fontBold = await pdfDoc.embedFont(lib.StandardFonts.HelveticaBold)
  const font = await pdfDoc.embedFont(lib.StandardFonts.Helvetica)
  await renderInvoiceIntoDoc(
    pdfDoc,
    lib,
    invoice,
    extraDetails,
    font,
    fontBold,
    logoUrl
  )
  return pdfDoc.save()
}

export async function createCombinedInvoicesPdf(
  invoices: BookingInvoiceReportItem[],
  extras: Record<string, unknown>,
  logoUrl: string = Logo
) {
  const lib = await loadPdfLib()
  const combined = await lib.PDFDocument.create()

  for (const invoice of invoices) {
    const key = String(invoice.id ?? invoice.invoiceNo)
    const extra = extras[key]
    const singleDoc = await lib.PDFDocument.create()
    const fontBold = await singleDoc.embedFont(lib.StandardFonts.HelveticaBold)
    const font = await singleDoc.embedFont(lib.StandardFonts.Helvetica)
    await renderInvoiceIntoDoc(
      singleDoc,
      lib,
      invoice,
      extra,
      font,
      fontBold,
      logoUrl
    )
    const pages = await combined.copyPages(
      singleDoc,
      singleDoc.getPageIndices()
    )
    pages.forEach((p) => combined.addPage(p))
  }

  return combined.save()
}

async function renderInvoiceIntoDoc(
  pdfDoc: PDFDocument,
  lib: PdfLib,
  invoice: BookingInvoiceReportItem,
  extraDetails: unknown,
  font: PDFFont,
  fontBold: PDFFont,
  logoUrl: string
) {
  const { rgb } = lib
  const lineGray = rgb(0.75, 0.82, 0.9)
  const invoiceNumberText = formatInvoiceNumber(invoice.invoiceNo)
  const extra =
    extraDetails && typeof extraDetails === 'object'
      ? (extraDetails as Record<string, unknown>)
      : {}

  const normalize = (value: unknown) => {
    const text = asText(value)
    return text === '-' ? '' : text
  }
  const getExtraString = (key: string, fallback = '') => {
    const text = normalize((extra as Record<string, unknown>)[key])
    return text || fallback
  }
  const collectAddressParts = () => {
    let parts = ['shopAddress1', 'shopAddress2', 'shopAddress3']
      .map((key) => getExtraString(key))
      .map((p) => (typeof p === 'string' ? p.trim() : String(p)))
      .filter((p) => Boolean(p))
    if (!parts.length) {
      parts = ['agentAddress1', 'agentAddress2', 'agentAddress3']
        .map((key) => getExtraString(key))
        .map((p) => (typeof p === 'string' ? p.trim() : String(p)))
        .filter((p) => Boolean(p))
    }
    if (!parts.length) {
      const fallback = normalize((invoice as any).address)
      if (fallback) {
        parts = fallback
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      }
    }
    return parts
  }
  const formatAddressTwoLines = (parts: string[]) => {
    if (!parts.length) return '-'
    const line1 = parts.slice(0, 2).join(', ')
    const line2 = parts.slice(2).join(', ')
    return [line1, line2].filter(Boolean).join('\n')
  }

  const agentNameText =
    getExtraString('agentName') ||
    normalize((invoice as any).agentName) ||
    normalize((invoice as any).dealerName) ||
    '-'
  const outletNameText =
    getExtraString('outletName') ||
    normalize((invoice as any).outletName) ||
    normalize((invoice as any).dealerName) ||
    '-'
  const shopAddressText = formatAddressTwoLines(collectAddressParts())
  const territoryCodeVal = getExtraString('territoryCode')
  const routeCodeVal = getExtraString('routeCode')
  const shopCodeVal = getExtraString('shopCode')
  const territoryText =
    territoryCodeVal ||
    normalize((invoice as any).territory) ||
    (invoice.territoryId ? String(invoice.territoryId) : '-') ||
    '-'
  const dealerCodeText = (() => {
    const parts = [territoryCodeVal, routeCodeVal, shopCodeVal]
    const hasAny = parts.some((p) => p)
    if (hasAny) {
      return parts.map((p) => p || '-').join('/')
    }
    return (
      getExtraString('dealerCode') ||
      (invoice.outletId ? String(invoice.outletId) : '-') ||
      '-'
    )
  })()
  const orderTimeText = getExtraString('orderTime', '-')
  const agentMobileText = getExtraString('agentMobileNumber', '-')

  const margin = 36
  let page: PDFPage = pdfDoc.addPage([595.28, 841.89]) // A4
  let { height, width } = page.getSize()
  const contentWidth = width - margin * 2
  let y = height - margin

  const drawLine = (yPos: number) => {
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      thickness: 1,
      color: lineGray,
    })
  }

  const newPage = () => {
    page = pdfDoc.addPage([595.28, 841.89])
    height = page.getSize().height
    width = page.getSize().width
    y = height - margin
    drawLine(y)
    y -= 20
  }

  // Header
  const drawHeader = async () => {
    const headerHeight = 60
    page.drawRectangle({
      x: 0,
      y: height - headerHeight - 30,
      width,
      height: headerHeight + 30,
      color: rgb(0.92, 0.92, 0.92),
    })
    for (let i = 0; i < 6; i++) {
      const shade = 0.5 + i * 0.07
      page.drawRectangle({
        x: i * 10,
        y: height - headerHeight - 30,
        width: 8,
        height: headerHeight + 30,
        color: rgb(shade, shade, shade),
      })
    }
    const logoBytes = await fetch(logoUrl).then((res) => res.arrayBuffer())
    const logoImage = await pdfDoc.embedPng(logoBytes)
    const logoWidth = 120
    const logoHeight = (logoImage.height / logoImage.width) * logoWidth
    page.drawImage(logoImage, {
      x: margin - 11.5,
      y: height - logoHeight - 22,
      width: logoWidth,
      height: logoHeight,
    })
    const companyName =
      agentNameText && agentNameText !== '-' ? agentNameText : ''
    const companyAddress = [
      getExtraString('agentAddress1'),
      getExtraString('agentAddress2'),
      getExtraString('agentAddress3'),
    ]
      .filter(Boolean)
      .join(', ')
    const companyContact =
      agentMobileText && agentMobileText !== '-'
        ? `Tel: ${agentMobileText}`
        : ''

    page.drawText('THE KINGDOM OF RAIGAM', {
      x: 20,
      y: height - logoHeight - 35,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    })
    page.drawText(companyName, {
      x: margin + 140,
      y: height - 35,
      size: 15,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    })
    page.drawText(companyAddress, {
      x: margin + 140,
      y: height - 50,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    })
    page.drawText(companyContact, {
      x: margin + 140,
      y: height - 65,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    })

    const titleText = 'INVOICE'
    const titleSize = 30
    const textWidth = fontBold.widthOfTextAtSize(titleText, titleSize)
    page.drawText(titleText, {
      x: width - textWidth - 20,
      y: height - 55,
      size: titleSize,
      font: fontBold,
      color: rgb(0.75, 0.05, 0.08),
    })
  }

  await drawHeader()
  y = height - 120

  // Info blocks
  const leftInfo: Array<[string, string]> = [
    ['Dealer Code:', dealerCodeText],
    ['Dealer Name:', outletNameText],
    ['Territory:', territoryText],
    ['Address:', shopAddressText],
  ]
  const rightInfo: Array<[string, string]> = [
    ['Invoice No:', invoiceNumberText],
    ['Invoice Date & Time:', formatDate(invoice.dateActual)],
    [
      'Order Date & Time:',
      (() => {
        const datePart = formatDate(invoice.dateBook)
        const timePart =
          orderTimeText && orderTimeText !== '-' ? orderTimeText : ''
        if (datePart === '-' && !timePart) return '-'
        return [datePart, timePart].filter(Boolean).join(' ')
      })(),
    ],
  ]

  const infoStartY = y
  const lineGap = 15
  const leftLabelX = margin
  const leftValueX = margin + 80
  const rightLabelX = margin + contentWidth / 2 + 20
  const rightValueX = rightLabelX + 130

  const drawColumn = (
    rows: Array<[string, string]>,
    xLabel: number,
    xValue: number,
    startY: number
  ) => {
    let yPos = startY
    let linesUsed = 0
    rows.forEach(([label, value]) => {
      const parts = (value || '-')
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean)
      const safeParts = parts.length ? parts : ['-']
      safeParts.forEach((part, idx) => {
        page.drawText(idx === 0 ? label : '', {
          x: xLabel,
          y: yPos,
          size: 11,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1),
        })
        page.drawText(part || '-', {
          x: xValue,
          y: yPos,
          size: 11,
          font,
          color: rgb(0.1, 0.1, 0.1),
        })
        yPos -= lineGap
        linesUsed++
      })
    })
    return linesUsed
  }

  const leftLines = drawColumn(leftInfo, leftLabelX, leftValueX, infoStartY)
  const rightLines = drawColumn(rightInfo, rightLabelX, rightValueX, infoStartY)
  const usedRows = Math.max(leftLines, rightLines)
  y = infoStartY - usedRows * lineGap - 12

  // Items table (cleaned layout)
  const formatNumber = (value?: number | null) => formatPrice(value)
  const formatQty = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '-'
    }
    const intVal = Math.trunc(Number(value))
    return intVal.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }

  const drawItemsTable = () => {
    const startX = margin
    const tableWidth = contentWidth
    const maxRowsPerPage = 25
    let rowsOnPage = 0
    const headers = [
      'Item Description',
      'Qty',
      'Unit Price(Rs.)',
      'Discount',
      'Value(Rs.)',
    ]
    const colWidths = [
      tableWidth * 0.46,
      tableWidth * 0.12,
      tableWidth * 0.14,
      tableWidth * 0.12,
      tableWidth * 0.16,
    ]

    const borderColor = rgb(0.75, 0.75, 0.75)
    const headerBgColor = rgb(0.93, 0.96, 1)
    const sectionBgColor = rgb(0.97, 0.93, 0.86)
    const textColor = rgb(0.1, 0.1, 0.1)
    const rowHeight = 18

    const drawVerticals = (topY: number, bottomY: number) => {
      // Left boundary
      page.drawLine({
        start: { x: startX, y: topY },
        end: { x: startX, y: bottomY },
        thickness: 0.6,
        color: borderColor,
      })

      let xCursor = startX
      colWidths.forEach((w) => {
        xCursor += w
        page.drawLine({
          start: { x: xCursor, y: topY },
          end: { x: xCursor, y: bottomY },
          thickness: 0.6,
          color: borderColor,
        })
      })
    }

    const startNewItemsPage = () => {
      newPage()
      y -= 10
      drawHeaderRow()
      rowsOnPage = 0
    }

    const ensureSpace = (rowHeight = 18, upcomingRows = 1) => {
      const needsPageByCount = rowsOnPage + upcomingRows > maxRowsPerPage
      const needsPageBySpace = y < margin + rowHeight + 20
      if (needsPageByCount || needsPageBySpace) {
        newPage()
        y -= 10
        drawHeaderRow()
        rowsOnPage = 0
      }
    }

    const drawHeaderRow = () => {
      const topY = y
      const bottomY = y - rowHeight

      page.drawRectangle({
        x: startX,
        y: bottomY,
        width: tableWidth,
        height: rowHeight,
        color: headerBgColor,
      })

      headers.forEach((title, i) => {
        const offset = colWidths.slice(0, i).reduce((a, b) => a + b, 0)
        const textWidth = fontBold.widthOfTextAtSize(title, 10)
        const centerAligned = i > 0
        const xPos = centerAligned
          ? startX + offset + colWidths[i] / 2 - textWidth / 2
          : startX + offset + 6
        page.drawText(title, {
          x: xPos,
          y: y - rowHeight + 7,
          size: 10,
          font: fontBold,
          color: textColor,
        })
      })
      // Top border
      page.drawLine({
        start: { x: startX, y: topY },
        end: { x: startX + tableWidth, y: topY },
        thickness: 0.8,
        color: borderColor,
      })
      // Bottom border
      page.drawLine({
        start: { x: startX, y: bottomY },
        end: { x: startX + tableWidth, y: bottomY },
        thickness: 0.8,
        color: borderColor,
      })
      drawVerticals(y, bottomY)
      y = bottomY
      rowsOnPage = 0
    }

    const drawRow = (
      values: Array<string | number>,
      opts?: { bold?: boolean; shaded?: boolean; backgroundColor?: any }
    ) => {
      ensureSpace()
      const rowFont = opts?.bold ? fontBold : font
      const topY = y
      const textY = y - rowHeight + 6
      if (opts?.backgroundColor) {
        page.drawRectangle({
          x: startX,
          y: y - rowHeight,
          width: tableWidth,
          height: rowHeight,
          color: opts.backgroundColor,
        })
      }
      values.forEach((value, i) => {
        const offset = colWidths.slice(0, i).reduce((a, b) => a + b, 0)
        const alignRight = i > 0
        const text =
          typeof value === 'number' ? formatNumber(value) : String(value ?? '')
        const textWidth = font.widthOfTextAtSize(text, 10)
        const xPos = alignRight
          ? startX + offset + colWidths[i] - textWidth - 6
          : startX + offset + 6
        page.drawText(text, {
          x: xPos,
          y: textY,
          size: 10,
          font: rowFont,
          color: textColor,
        })
      })
      const bottomY = y - rowHeight
      // Left/right + column separators
      drawVerticals(topY, bottomY)
      // Bottom border for this row
      page.drawLine({
        start: { x: startX, y: bottomY },
        end: { x: startX + tableWidth, y: bottomY },
        thickness: 0.4,
        color: borderColor,
      })
      y -= rowHeight
      rowsOnPage += 1
    }

    // Make sure the header has room; if not, move to a new page first
    if (y < margin + rowHeight + 40) {
      startNewItemsPage()
    } else {
      drawHeaderRow()
    }

    const items = invoice.invoiceDetailDTOList ?? []
    if (!items.length) {
      drawRow(['No items available', '', '', '', ''], { shaded: true })
      return
    }

    let shaded = false
    let totalValue = 0
    items.forEach((item, idx) => {
      const qty = Math.max(
        (item.totalBookQty ?? 0) - (item.totalCancelQty ?? 0),
        0
      )
      const unitPrice =
        item.adjustedUnitPrice ??
        item.sellUnitPrice ??
        item.marketReturnUnitPrice ??
        item.goodReturnUnitPrice ??
        0
      const discountPct =
        item.bookDiscountPercentage ?? item.discountPercentage ?? 0
      const value =
        item.finalTotalValue ??
        item.totalBookSellValue ??
        item.sellTotalPrice ??
        item.totalBookValue ??
        0
      totalValue += Number(value) || 0

      drawRow(
        [
          `${idx + 1}. ${item.itemName ?? 'Item'}`,
          formatQty(qty),
          formatNumber(unitPrice),
          `${formatNumber(discountPct)}%`,
          formatNumber(value),
        ],
        { shaded }
      )
      shaded = !shaded
    })

    const drawReturnSection = (
      title: string,
      filteredItems: typeof items,
      options: {
        qtyKey: keyof (typeof items)[number]
        priceKey?: keyof (typeof items)[number]
        valueKey?: keyof (typeof items)[number]
        isFree?: boolean
      }
    ) => {
      if (!filteredItems.length) return
      drawRow(['', '', '', '', ''], { shaded: false })
      drawRow([title, '', '', '', ''], {
        bold: true,
        backgroundColor: sectionBgColor,
      })
      filteredItems.forEach((item) => {
        const qtyRaw = Number(item[options.qtyKey] ?? 0)
        const qtyVal = Math.trunc(qtyRaw)
        const price = options.priceKey
          ? Number(item[options.priceKey] ?? 0)
          : ''
        const value = options.isFree
          ? ''
          : options.valueKey
            ? Number(item[options.valueKey] ?? 0)
            : ''
        drawRow(
          [`• ${item.itemName ?? 'Item'}`, formatQty(qtyVal), price, '', value],
          { shaded, backgroundColor: sectionBgColor }
        )
        shaded = !shaded
      })
    }

    drawReturnSection(
      'Market Return',
      items.filter((item) => (item.marketReturnTotalQty ?? 0) > 0),
      {
        qtyKey: 'marketReturnTotalQty',
        priceKey: 'marketReturnUnitPrice',
        valueKey: 'marketReturnTotalVal',
      }
    )

    drawReturnSection(
      'Market Return Free Issues',
      items.filter((item) => (item.marketReturnFreeQty ?? 0) > 0),
      {
        qtyKey: 'marketReturnFreeQty',
        isFree: true,
      }
    )

    drawReturnSection(
      'Good Return',
      items.filter((item) => (item.goodReturnTotalQty ?? 0) > 0),
      {
        qtyKey: 'goodReturnTotalQty',
        priceKey: 'goodReturnUnitPrice',
        valueKey: 'goodReturnTotalVal',
      }
    )

    drawReturnSection(
      'Good Return Free Issues',
      items.filter((item) => (item.goodReturnFreeQty ?? 0) > 0),
      {
        qtyKey: 'goodReturnFreeQty',
        isFree: true,
      }
    )

    // Free issue rows from API data (totalFreeQty)
    const freeItems = items.filter(
      (item) => Math.trunc(Number(item.totalFreeQty ?? 0)) > 0
    )
    if (freeItems.length) {
      drawRow(['', '', '', '', ''], { shaded: false })
      drawRow(['Free Issues', '', '', '', ''], {
        bold: true,
        backgroundColor: sectionBgColor,
      })
      freeItems.forEach((item) => {
        drawRow(
          [
            `• ${item.itemName ?? 'Item'}`,
            formatQty(Math.trunc(Number(item.totalFreeQty ?? 0))),
            '',
            '',
            '',
          ],
          { shaded, backgroundColor: sectionBgColor }
        )
        shaded = !shaded
      })
    }

    y -= 10

    // Ensure summary table is visible on the current page
    const grossValue =
      invoice.totalBookFinalValue ?? invoice.totalBookValue ?? totalValue
    const lineDiscountValue = invoice.totalDiscountValue ?? 0
    const lineDiscountPct = invoice.discountPercentage ?? 0
    const invoiceValue = Math.max(grossValue - lineDiscountValue, 0)
    const summaryRows: Array<[string, number | string]> = [
      ['Gross Value(Rs.)', grossValue],
      [`Bill Discount (${formatNumber(lineDiscountPct)}%)`, lineDiscountValue],
      ['Invoice Value(Rs.)', formatPrice(invoiceValue)],
    ]
    const summaryRowHeight = 18
    const summaryTableHeight = summaryRows.length * summaryRowHeight
    if (y < margin + summaryTableHeight + 20) {
      newPage()
      y -= 10
    }

    // Bottom summary table (aligned to bottom-right of items table)
    const summaryTableWidth = Math.min(tableWidth * 0.45, 240)
    const summaryLabelWidth = summaryTableWidth * 0.6
    const summaryStartX = startX + tableWidth - summaryTableWidth
    const tableTopY = y
    const tableBottomY = tableTopY - summaryTableHeight

    // Outer border
    page.drawLine({
      start: { x: summaryStartX, y: tableTopY },
      end: { x: summaryStartX + summaryTableWidth, y: tableTopY },
      thickness: 0.8,
      color: borderColor,
    })
    page.drawLine({
      start: { x: summaryStartX, y: tableBottomY },
      end: { x: summaryStartX + summaryTableWidth, y: tableBottomY },
      thickness: 0.8,
      color: borderColor,
    })
    page.drawLine({
      start: { x: summaryStartX, y: tableTopY },
      end: { x: summaryStartX, y: tableBottomY },
      thickness: 0.8,
      color: borderColor,
    })
    page.drawLine({
      start: { x: summaryStartX + summaryTableWidth, y: tableTopY },
      end: { x: summaryStartX + summaryTableWidth, y: tableBottomY },
      thickness: 0.8,
      color: borderColor,
    })

    // Column divider
    const columnX = summaryStartX + summaryLabelWidth
    page.drawLine({
      start: { x: columnX, y: tableTopY },
      end: { x: columnX, y: tableBottomY },
      thickness: 0.8,
      color: borderColor,
    })

    summaryRows.forEach(([label, value], idx) => {
      const rowTop = tableTopY - idx * summaryRowHeight
      const rowBottom = rowTop - summaryRowHeight
      const textY = rowBottom + 6

      // Horizontal separator between rows
      if (idx > 0) {
        page.drawLine({
          start: { x: summaryStartX, y: rowTop },
          end: { x: summaryStartX + summaryTableWidth, y: rowTop },
          thickness: 0.6,
          color: borderColor,
        })
      }

      const valueText =
        typeof value === 'number' ? formatNumber(value) : String(value)
      const isFinalRow = idx === summaryRows.length - 1

      page.drawText(label, {
        x: summaryStartX + 6,
        y: textY,
        size: isFinalRow ? 10.5 : 10,
        font: isFinalRow ? fontBold : font,
        color: textColor,
      })

      const valueWidth = font.widthOfTextAtSize(
        valueText,
        isFinalRow ? 10.5 : 10
      )
      page.drawText(valueText, {
        x: summaryStartX + summaryTableWidth - 6 - valueWidth,
        y: textY,
        size: isFinalRow ? 10.5 : 10,
        font: isFinalRow ? fontBold : font,
        color: textColor,
      })
    })

    y = tableBottomY - 8
  }

  drawItemsTable()

  // Customer acknowledgement block (payment + signature)
  const drawAcknowledgement = () => {
    const sectionHeight = 90
    if (y < margin + sectionHeight) {
      newPage()
      y -= 6
    }

    const columnGap = 200
    const lineLength = 120
    const dottedLine = '.'.repeat(40)

    page.drawText('Mode of payment :', {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    })
    y -= 14
    page.drawText('Received the above article in good condition and order', {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.1, 0.1, 0.1),
    })
    y -= 22

    page.drawText('Customer Signature', {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    })
    page.drawText('Date', {
      x: margin + columnGap,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    })
    y -= 16

    // Dotted lines
    page.drawText(dottedLine, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    })
    page.drawText(
      dottedLine.slice(0, Math.min(dottedLine.length, lineLength / 3)),
      {
        x: margin + columnGap,
        y,
        size: 10,
        font,
        color: rgb(0.2, 0.2, 0.2),
      }
    )
    y -= 12
  }

  drawAcknowledgement()

  // Footer across pages
  const applyFooter = () => {
    const footerHeight = 40
    const pages = pdfDoc.getPages()
    const totalPages = pages.length

    pages.forEach((p, idx) => {
      const { width: pw } = p.getSize()

      p.drawRectangle({
        x: 0,
        y: 0,
        width: pw,
        height: footerHeight,
        color: rgb(0.7, 0.7, 0.7),
      })

      const footerText =
        '© Raigam Marketing Services (Pvt) Ltd | www.raigam.lk'
      const addressText =
        'Address: No. 277, Kiriwattuduwa, Homagama | Head Office: 011 2 753 340 | E-mail: info@raigam.lk'
      const textWidth = font.widthOfTextAtSize(footerText, 10)
      const centerX = (pw - textWidth) / 2
      const addressWidth = font.widthOfTextAtSize(addressText, 8)
      const addressX = (pw - addressWidth) / 2

      p.drawText(addressText, {
        x: addressX,
        y: 21,
        size: 8,
        font,
        color: rgb(0.2, 0.2, 0.2),
      })

      p.drawText(footerText, {
        x: centerX,
        y: 9,
        size: 8,
        font,
        color: rgb(0.2, 0.2, 0.2),
      })

      const pageNumText = `Page ${idx + 1} of ${totalPages}`
      const pageNumWidth = font.widthOfTextAtSize(pageNumText, 8)
      p.drawText(pageNumText, {
        x: pw - margin - pageNumWidth,
        y: 11,
        size: 8,
        font,
        color: rgb(0.2, 0.2, 0.2),
      })
    })
  }
  applyFooter()
}
