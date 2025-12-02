import React, { Fragment } from 'react'
import type {
  BookingInvoiceDetailDTO,
  BookingInvoiceReportItem,
  InvoicePrintData,
} from '@/types/invoice'
import InvoiceNumber from '@/components/InvoiceNumber'
import logoAsset from '@/assets/logo.png'

const formatDate = (value?: string) => {
  if (!value || value === '0001-01-01') return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString()
}

const formatInvoiceNo = (raw?: string) => {
  if (!raw) return raw ?? ''
  const match = raw.match(/^([A-Za-z]*)(\d+)$/)
  if (!match) return raw
  const prefix = match[1] || ''
  const digits = match[2] || ''
  const trimmed = digits.replace(/^0+/, '') || '0'
  const padded = trimmed.padStart(8, '0')
  return `${prefix}${padded}`
}

const formatMoney = (value?: number | null) =>
  typeof value === 'number' && !Number.isNaN(value) ? value.toFixed(2) : '0.00'

const firstNumber = (...values: Array<number | null | undefined>) => {
  for (const v of values) {
    if (typeof v === 'number' && !Number.isNaN(v)) return v
  }
  return 0
}

type PrintableItem = {
  itemName: string
  unitPrice: number
  specialDiscount: number
  quantity: number
  freeIssue: number
  goodReturnUnitPrice: number
  goodReturnFreeQty: number
  goodReturnTotalQty: number
  goodReturnTotalVal: number
  marketReturnUnitPrice: number
  marketReturnFreeQty: number
  marketReturnTotalQty: number
  marketReturnTotalVal: number
  lineTotal: number
}

type CategorizedItems = Record<string, PrintableItem[]>

const coerceDetailList = (payload?: InvoicePrintData) => {
  if (!payload) return []
  const anyPayload = payload as unknown as Record<string, unknown>
  const candidates = [
    anyPayload?.invoiceDetailDTOList,
    anyPayload?.invoiceDetails,
    anyPayload?.items,
  ]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as BookingInvoiceDetailDTO[]
    }
  }
  return []
}

const buildCategorizedItems = (
  details: BookingInvoiceDetailDTO[] | undefined
): CategorizedItems => {
  if (!details?.length) return {}
  const items: PrintableItem[] = details.map((detail) => ({
    itemName: detail.itemName,
    unitPrice: detail.sellUnitPrice,
    specialDiscount: detail.discountPercentage,
    quantity: detail.totalBookQty,
    freeIssue: detail.totalFreeQty,
    goodReturnUnitPrice: detail.goodReturnUnitPrice,
    goodReturnFreeQty: detail.goodReturnFreeQty,
    goodReturnTotalQty: detail.goodReturnTotalQty,
    goodReturnTotalVal: detail.goodReturnTotalVal,
    marketReturnUnitPrice: detail.marketReturnUnitPrice,
    marketReturnFreeQty: detail.marketReturnFreeQty,
    marketReturnTotalQty: detail.marketReturnTotalQty,
    marketReturnTotalVal: detail.marketReturnTotalVal,
    lineTotal:
      detail.sellTotalPrice ??
      detail.totalBookValue ??
      detail.totalBookSellValue ??
      0,
  }))

  // No explicit categories available, group everything under "Items"
  return { Items: items }
}

export type InvoicePrintLayoutProps = {
  invoice: BookingInvoiceReportItem
  payload?: InvoicePrintData
  logoUrl?: string
}

const InvoicePrintLayout = ({
  invoice,
  payload,
  logoUrl,
}: InvoicePrintLayoutProps) => {
  const logoSrc = logoUrl ?? logoAsset
  const payloadDetails = coerceDetailList(payload)
  const details =
    invoice.invoiceDetailDTOList?.length && invoice.invoiceDetailDTOList.length > 0
      ? invoice.invoiceDetailDTOList
      : payloadDetails
  const address = [payload?.address1, payload?.address2, payload?.address3]
    .filter(Boolean)
    .join(', ')
  const territory = payload?.territoryCode ?? String(invoice.territoryId)
  const outletName = payload?.outletName ?? invoice.outletName
  const orderDateTime =
    payload?.orderTime || formatDate(invoice.dateActual) || '-'
  const route = payload?.routeCode ?? invoice.routeName
  const shopCode = payload?.shopCode
  const dealerName = payload?.dealerName ?? invoice.outletName ?? '-'
  const categorizedItems = buildCategorizedItems(details)

  const invoiceSubtotal = firstNumber(
    invoice.totalBookValue,
    invoice.totalBookSellValue,
    invoice.totalBookFinalValue,
    payload?.totalBookValue,
    payload?.totalBookSellValue,
    payload?.totalBookFinalValue
  )
  const billDiscount = firstNumber(
    invoice.discountPercentage,
    payload?.discountPercentage
  )
  const billDiscountValue = firstNumber(
    invoice.totalDiscountValue,
    payload?.totalDiscountValue
  )
  const invoiceNetValue = firstNumber(
    invoice.totalBookFinalValue,
    invoice.totalBookValue,
    payload?.totalBookFinalValue,
    payload?.totalBookValue
  )
  const totalFreeValue = firstNumber(
    invoice.totalFreeValue,
    payload?.totalFreeValue
  )
  const totalGoodReturnValue = firstNumber(
    invoice.totalGoodReturnValue,
    payload?.totalGoodReturnValue
  )
  const totalMarketReturnValue = firstNumber(
    invoice.totalMarketReturnValue,
    payload?.totalMarketReturnValue
  )
  const totalActualValue = firstNumber(
    invoice.totalActualValue,
    payload?.totalActualValue,
    invoiceNetValue
  )

  const hasMarketReturns = Object.values(categorizedItems).some((items) =>
    items.some(
      (item) => item.marketReturnTotalQty > 0 || item.marketReturnFreeQty > 0
    )
  )

  const hasGoodReturns = Object.values(categorizedItems).some((items) =>
    items.some(
      (item) => item.goodReturnTotalQty > 0 || item.goodReturnFreeQty > 0
    )
  )

  return (
    <div
      className='invoice-container'
      style={{
        padding: '10px',
        margin: '0 auto',
        boxSizing: 'border-box',
        pageBreakAfter: 'always',
        pageBreakInside: 'avoid',
        width: '100%',
        maxWidth: '190mm',
        color: '#000',
        backgroundColor: '#ccc',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
      }}
    >
      <div className='logo-container'>
        <img
          src={logoSrc}
          alt='Logo'
          style={{ width: '150px' }}
        />
        <div className='address-container'>
          <h3 style={{ margin: '2px 0', lineHeight: 1.2, fontWeight:'bold' }}>
            Raigam Marketing Services
          </h3>
          <p style={{ margin: '2px 0', lineHeight: 1.2 }}>
            No. 277, Kiriwattuduwa, Homagama
          </p>
          <p style={{ margin: '2px 0', lineHeight: 1.2 }}>
            Tel: 0112753350 | Fax: 0112753350
          </p>
        </div>
      </div>

      <div className='Customer-details' style={{ marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontWeight:'bold',fontSize:16 }}>
          INVOICE
        </h3>
      </div>

      <div className='invoice-details'>
        <div className='details-column'>
          <p>
            <b>Dealer Name:</b> {dealerName || '-'}
          </p>
          <p>
            <b>Address:</b> {address || '-'}
          </p>
          <p>
            <b>Territory:</b> {territory || '-'}
          </p>
          <p>
            <b>Route:</b> {route || '-'}
          </p>
          <p>
            <b>Shop Code:</b> {shopCode || '-'}
          </p>
        </div>
        <div className='details-column1'>
          <p>
            <b>Invoice No:</b>{' '}
            <InvoiceNumber
              invoiceId={invoice.invoiceNo}
              className='font-semibold'
            />
          </p>
          <p>
            <b>Invoice Date &amp; Time:</b> {formatDate(invoice.dateBook)}
          </p>
          <p>
            <b>Order Date &amp; Time:</b> {orderDateTime}
          </p>
        </div>
      </div>

      <table className='invoice-table'>
        <thead>
          <tr>
            <th>#</th>
            <th>Item Description</th>
            <th>Qty</th>
            <th>Free Qty</th>
            <th>WS Price</th>
            <th>Discount</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(categorizedItems).map(([category, items]) => (
            <Fragment key={category}>
              <tr className='category-row'>
                <td colSpan={7}>{category}</td>
              </tr>
              {items.map((item, idx) => (
                <tr key={`${category}-${idx}`}>
                  <td>{idx + 1}</td>
                  <td>{item.itemName}</td>
                  <td>{item.quantity}</td>
                  <td>{item.freeIssue}</td>
                  <td>{formatMoney(item.unitPrice)}</td>
                  <td>{formatMoney(item.specialDiscount)}%</td>
                  <td>{formatMoney(item.lineTotal)}</td>
                </tr>
              ))}
              <tr className='category-row'>
                <td colSpan={7}>Total</td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>

      {hasMarketReturns ? (
        <>
          <b>Market Returns:</b>
          <table className='invoice-table'>
            <thead>
              <tr>
                <th>#</th>
                <th>Item Description</th>
                <th>Qty</th>
                <th>Free Qty</th>
                <th>WS Price</th>
                <th></th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(categorizedItems).map(([category, items]) => (
                <Fragment key={`mr-${category}`}>
                  {items
                    .filter(
                      (item) =>
                        item.marketReturnTotalQty > 0 ||
                        item.marketReturnFreeQty > 0
                    )
                    .map((item, idx) => (
                      <tr key={`mr-${category}-${idx}`}>
                        <td>{idx + 1}</td>
                        <td>{item.itemName}</td>
                        <td>{item.marketReturnTotalQty}</td>
                        <td>{item.marketReturnFreeQty}</td>
                        <td>{formatMoney(item.marketReturnUnitPrice)}</td>
                        <td>-</td>
                        <td>{formatMoney(item.marketReturnTotalVal)}</td>
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {hasGoodReturns ? (
        <>
          <b>Good Returns:</b>
          <table className='invoice-table'>
            <thead>
              <tr>
                <th>#</th>
                <th>Item Description</th>
                <th>Qty</th>
                <th>Free Qty</th>
                <th>WS Price</th>
                <th></th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(categorizedItems).map(([category, items]) => (
                <Fragment key={`gr-${category}`}>
                  {items
                    .filter(
                      (item) =>
                        item.goodReturnTotalQty > 0 ||
                        item.goodReturnFreeQty > 0
                    )
                    .map((item, idx) => (
                      <tr key={`gr-${category}-${idx}`}>
                        <td>{idx + 1}</td>
                        <td>{item.itemName}</td>
                        <td>{item.goodReturnTotalQty}</td>
                        <td>{item.goodReturnFreeQty}</td>
                        <td>{formatMoney(item.goodReturnUnitPrice)}</td>
                        <td>-</td>
                        <td>{formatMoney(item.goodReturnTotalVal)}</td>
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      <div className='totals'>
        <p>Gross Value: Rs. {formatMoney(invoiceSubtotal)}</p>
        <p>
          Bill Discount ({formatMoney(billDiscount)}%): Rs.{' '}
          {formatMoney(billDiscountValue)}
        </p>
        <p>
          <b>Net Value:</b> Rs. {formatMoney(invoiceNetValue)}
        </p>
        <p>Total Free Issues: Rs. {formatMoney(totalFreeValue)}</p>
        <p>
          Total Good Returns: Rs. {formatMoney(totalGoodReturnValue)}
        </p>
        <p>
          Total Market Returns: Rs. {formatMoney(totalMarketReturnValue)}
        </p>
        <p>
          <b>Final Payable:</b> Rs. {formatMoney(totalActualValue)}
        </p>
      </div>

      <div className='footer'>
        <p>Received the above article in good condition and order</p>
        <div className='signature'>
          <span>Customer Signature.................................</span>
          <span>Date: ..........................</span>
        </div>
        <div className='signature' style={{ marginTop: '12px' }}>
          <p>Sales Reps Name :</p>
          <p>Sales Reps Mobile :</p>
          <p>Area Manager:</p>
        </div>
      </div>

      <style>
        {`
          .invoice-container {
            font-family: Arial, sans-serif;
            font-size: 11px;
            color: #000;
            margin: 0 auto;
            padding: 20px;
            box-sizing: border-box;
            width: 100%;
            page-break-after: always;
            page-break-inside: avoid;
          }
          .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          .Customer-details {
            display: flex;
            justify-content: center;
            text-align: center;
            margin-bottom: 8px;
          }
          .details-column {
            width: 48%;
            text-align: left;
          }
          .details-column1 {
            width: 48%;
            text-align: right;
          }
          .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .invoice-table th, .invoice-table td {
            border: 1px solid #d1d5db;
            padding: 4px;
            text-align: center;
          }
          .category-row td {
            background: #f0f0f0;
            font-weight: bold;
            text-align: left;
          }
          .totals {
            margin-top: 10px;
            text-align: right;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
          }
          .signature {
            display: flex;
            justify-content: space-around;
            margin-top: 20px;
          }
          .logo-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            background: #f5f5f5;
            padding: 8px 12px;
            border-radius: 4px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .address-container {
            text-align: left;
            flex-grow: 1;
            margin-left: 20px;
          }
          .logo-container h3,
          .logo-container p,
          .Customer-details h3,
          .Customer-details h4,
          .invoice-details p {
            margin: 2px 0;
            line-height: 1.2;
          }
        `}
      </style>
    </div>
  )
}

export default InvoicePrintLayout
