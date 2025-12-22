import { useMemo, useState, useCallback } from 'react'
import { isAxiosError } from 'axios'
import { useQuery } from '@tanstack/react-query'
import { createInvoice } from '@/services/sales/invoice/invoiceApi'
import { getAllOutletsByTerritoryId } from '@/services/userDemarcation/endpoints'
import type { AuthUser } from '@/store/authSlice'
import { useAppSelector } from '@/store/hooks'
import type { OutletDTO } from '@/types/demarcation'
import type {
  BookingInvoiceDetailDTO,
  BookingInvoiceReportItem,
  CreateInvoicePayload,
  InvoiceType,
} from '@/types/invoice'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { safeNumber } from '@/lib/invoice-calcs'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import FullWidthDialog from '@/components/FullWidthDialog'
import BookingInvoiceDetailsHeader from '@/components/agency-module/booking-invoice-details-header'
import ManualInvoiceItemsTable, {
  type ManualSavePayload,
} from '@/components/agency-module/manual-invoice-items-table'

const invoiceTypeOptions = [
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Agency', value: 'AGENCY' },
  { label: 'Company', value: 'COMPANY' },
]

const invoiceModeOptions = [{ label: 'Booking', value: 'BOOKING' }]

type ManualOutlet = OutletDTO & {
  id?: number | string
  outletId?: number | string
  userId?: number | null
  agencyCode?: number | string | null
  routeCode?: number | string | null
  shopCode?: number | string | null
  outletCode?: string
  outletName?: string
  uniqueCode?: string
  territoryId?: number
  territoryCode?: string
  agencyId?: number
  agencyWarehouseId?: number | null
  routeId?: number
  routeName?: string
  rangeId?: number
  outletCategoryName?: string
  outletCategoryId?: number
  vatNum?: string | null
  address1?: string
  address2?: string
  address3?: string
  latitude?: number
  longitude?: number
  imagePath?: string
  isApproved?: boolean
  isClose?: boolean
  territoryName?: string
  ownerName?: string
  mobileNo?: string
  rangeName?: string
  displayOrder?: number
  outletSequence?: number
  openTime?: string | null
  closeTime?: string | null
  isNew?: boolean
  updated?: string
  created?: string
  image?: string | null
}

const formatManualDate = (value?: string) => {
  if (!value || value === '0001-01-01') return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString()
}

const toIdNumber = (value: unknown, fallback = 0) => {
  if (value === null || value === undefined) return fallback
  const num =
    typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(num) ? num : fallback
}

const buildManualDraft = (
  outlet: ManualOutlet,
  type: InvoiceType,
  mode: string,
  userId: number | null,
  territoryId: number | null
): BookingInvoiceReportItem => {
  const normalizedMode = (mode ?? '').toUpperCase()
  const isActual = normalizedMode === 'ACTUAL'
  const isBook = !isActual
  const now = new Date().toISOString()
  const outletId = toIdNumber(outlet.outletId ?? outlet.id)
  return {
    id: Date.now(),
    userId,
    territoryId: toIdNumber(outlet.territoryId, territoryId ?? 0),
    agencyWarehouseId: toIdNumber((outlet as any).agencyWarehouseId),
    routeId: toIdNumber(outlet.routeId),
    routeName: outlet.routeName ?? '-',
    rangeId: toIdNumber(outlet.rangeId),
    outletId,
    outletName: outlet.outletName ?? 'Manual Outlet',
    invoiceNo: `MAN-${Date.now()}`,
    totalBookValue: 0,
    totalBookSellValue: 0,
    totalBookFinalValue: 0,
    totalCancelValue: 0,
    totalMarketReturnValue: 0,
    totalGoodReturnValue: 0,
    totalFreeValue: 0,
    totalActualValue: 0,
    totalDiscountValue: 0,
    discountPercentage: 0,
    dateBook: now,
    dateActual: now,
    dateSave: now,
    invoiceType: type,
    sourceApp: 'WEB',
    longitude: outlet.longitude ?? 0,
    latitude: outlet.latitude ?? 0,
    isReversed: false,
    isPrinted: false,
    isBook,
    isActual,
    isLateDelivery: false,
    invActualBy: userId ?? 0,
    invReversedBy: 0,
    invUpdatedBy: userId ?? 0,
    invCancelledBy: null,
    isActive: true,
    invoiceDetailDTOList: [],
  }
}

const toCurrency = (value?: number | null) =>
  Number(safeNumber(value).toFixed(2))

const mapDetailToCreatePayload = (
  detail: BookingInvoiceDetailDTO
): CreateInvoicePayload['invoiceDetailDTOList'][number] => ({
  itemId: detail.itemId ?? 0,
  sellPriceId: detail.sellPriceId ?? null,
  sellUnitPrice: toCurrency(detail.sellUnitPrice),
  totalBookQty: safeNumber(detail.totalBookQty),
  bookDiscountPercentage: safeNumber(
    detail.bookDiscountPercentage ?? detail.discountPercentage
  ),
  totalBookDiscountValue: toCurrency(
    detail.totalBookDiscountValue ?? detail.totalDiscountValue
  ),
  totalBookValue: toCurrency(detail.totalBookValue),
  totalBookSellValue: toCurrency(
    detail.totalBookSellValue ?? detail.sellTotalPrice
  ),
  totalCancelQty: safeNumber(detail.totalCancelQty),
  totalFreeQty: safeNumber(detail.totalFreeQty),
  totalActualQty: safeNumber(detail.totalActualQty),
  totalDiscountValue: toCurrency(
    detail.totalDiscountValue ?? detail.totalBookDiscountValue
  ),
  discountPercentage: safeNumber(
    detail.discountPercentage ?? detail.bookDiscountPercentage
  ),
  sellTotalPrice: toCurrency(
    detail.sellTotalPrice ?? detail.totalBookSellValue
  ),
  goodReturnPriceId: detail.goodReturnPriceId ?? null,
  goodReturnUnitPrice: toCurrency(detail.goodReturnUnitPrice),
  goodReturnFreeQty: safeNumber(detail.goodReturnFreeQty),
  goodReturnTotalQty: safeNumber(detail.goodReturnTotalQty),
  goodReturnTotalVal: toCurrency(detail.goodReturnTotalVal),
  marketReturnPriceId: detail.marketReturnPriceId ?? null,
  marketReturnUnitPrice: toCurrency(detail.marketReturnUnitPrice),
  marketReturnFreeQty: safeNumber(detail.marketReturnFreeQty),
  marketReturnTotalQty: safeNumber(detail.marketReturnTotalQty),
  marketReturnTotalVal: toCurrency(detail.marketReturnTotalVal),
  finalTotalValue: toCurrency(
    detail.finalTotalValue ?? detail.sellTotalPrice ?? 0
  ),
  isActive: detail.isActive ?? true,
})

const buildCreateInvoicePayload = (
  payload: ManualSavePayload,
  fallbackUserId: number | null,
  sourceOutlet?: ManualOutlet | null
): CreateInvoicePayload => {
  const { invoice, details, totals, discountPercentage } = payload
  const outletTerritoryId = toIdNumber(
    sourceOutlet?.territoryId ?? invoice.territoryId ?? fallbackUserId ?? 0
  )
  const outletRangeId = toIdNumber(
    sourceOutlet?.rangeId ?? invoice.rangeId ?? 0
  )
  const outletRouteId = toIdNumber(
    sourceOutlet?.routeId ?? invoice.routeId ?? 0
  )
  const outletAgencyWarehouseId = toIdNumber(
    sourceOutlet?.agencyWarehouseId ??
      invoice.agencyWarehouseId ??
      sourceOutlet?.userId ??
      fallbackUserId ??
      0
  )
  const outletId = toIdNumber(
    sourceOutlet?.outletId ??
      sourceOutlet?.id ??
      invoice.outletId ??
      fallbackUserId ??
      0
  )

  const summaryDiscountPct = discountPercentage ?? 0
  const grossFinalValue = toCurrency(totals.totalFinalValue)
  const summaryDiscountValue = Number(
    ((grossFinalValue * summaryDiscountPct) / 100).toFixed(2)
  )
  const shouldSendActualTotals = invoice.isActual ?? false
  const totalActualValue = shouldSendActualTotals
    ? Number((grossFinalValue - summaryDiscountValue).toFixed(2))
    : 0

  return {
    userId: invoice.userId ?? fallbackUserId ?? 0,
    territoryId: outletTerritoryId,
    agencyWarehouseId: outletAgencyWarehouseId,
    routeId: outletRouteId,
    rangeId: outletRangeId,
    outletId,
    totalBookValue: toCurrency(totals.totalBookValue),
    totalBookSellValue: toCurrency(totals.totalBookSellValue),
    totalBookFinalValue: toCurrency(totals.totalBookFinalValue),
    totalCancelValue: toCurrency(totals.totalCancelValue),
    totalMarketReturnValue: toCurrency(totals.totalMarketReturnValue),
    totalGoodReturnValue: toCurrency(totals.totalGoodReturnValue),
    totalFreeValue: toCurrency(totals.totalFreeValue),
    totalActualValue,
    totalDiscountValue: summaryDiscountValue,
    discountPercentage: summaryDiscountPct,
    invoiceType: invoice.invoiceType ?? 'NORMAL',
    sourceApp: invoice.sourceApp ?? 'WEB',
    longitude: invoice.longitude ?? 0,
    latitude: invoice.latitude ?? 0,
    isReversed: invoice.isReversed ?? false,
    isPrinted: invoice.isPrinted ?? false,
    isBook: invoice.isBook ?? true,
    isActual: invoice.isActual ?? false,
    isLateDelivery: invoice.isLateDelivery ?? false,
    invActualBy: invoice.invActualBy ?? fallbackUserId ?? 0,
    invReversedBy: invoice.invReversedBy ?? 0,
    invUpdatedBy: invoice.invUpdatedBy ?? fallbackUserId ?? 0,
    isActive: invoice.isActive ?? true,
    invoiceDetailDTOList: details.map(mapDetailToCreatePayload),
  }
}

const ManualInvoice = () => {
  const user = useAppSelector((state) => state.auth.user)
  const persistedUser = useMemo(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem('auth_user')
      return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch {
      return null
    }
  }, [])
  const effectiveUser = user ?? persistedUser
  const [customerId, setCustomerId] = useState<string>('')
  const [invoiceType, setInvoiceType] = useState<string>('')
  const [invoiceMode, setInvoiceMode] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedOutlet, setSelectedOutlet] = useState<ManualOutlet | null>(
    null
  )
  const [builderOpen, setBuilderOpen] = useState(false)
  const [manualInvoice, setManualInvoice] =
    useState<BookingInvoiceReportItem | null>(null)
  const [payloadPreview, setPayloadPreview] = useState<string | null>(null)

  const { data: outlets = [], isLoading: isOutletLoading } = useQuery<
    ManualOutlet[]
  >({
    queryKey: ['manual-invoice-outlets', effectiveUser?.territoryId],
    enabled: Boolean(effectiveUser?.territoryId),
    queryFn: async () => {
      const res = await getAllOutletsByTerritoryId(
        effectiveUser?.territoryId ?? 0
      )
      return res?.payload ?? []
    },
  })

  const sortedOutlets = useMemo(
    () =>
      [...outlets].sort((a, b) =>
        (a.outletName ?? '').localeCompare(b.outletName ?? '')
      ),
    [outlets]
  )

  const keyedOutlets = useMemo(
    () =>
      sortedOutlets.map((outlet, idx) => {
        const rawId =
          outlet.outletId ??
          outlet.id ??
          outlet.outletCode ??
          outlet.uniqueCode ??
          outlet.outletName ??
          idx
        return {
          key: String(rawId),
          outlet: {
            ...outlet,
            outletId: outlet.outletId ?? outlet.id ?? idx,
          },
        }
      }),
    [sortedOutlets]
  )

  const outletLookup = useMemo(() => {
    const map: Record<string, ManualOutlet> = {}
    keyedOutlets.forEach(({ key, outlet }) => {
      map[key] = outlet
    })
    return map
  }, [keyedOutlets])

  const mapUrl = useMemo(() => {
    if (!selectedOutlet?.latitude || !selectedOutlet?.longitude) return null
    const lat = selectedOutlet.latitude
    const lng = selectedOutlet.longitude
    return `https://www.google.com/maps?q=${lat},${lng}&output=embed`
  }, [selectedOutlet?.latitude, selectedOutlet?.longitude])

  const isProceedDisabled =
    !customerId || !invoiceType || !invoiceMode || isSubmitting

  const handleProceed = async () => {
    if (isProceedDisabled || !selectedOutlet || !invoiceType || !invoiceMode) {
      toast.error('Select outlet, invoice type, and mode.')
      return
    }
    setIsSubmitting(true)
    try {
      const draft = buildManualDraft(
        selectedOutlet,
        invoiceType as InvoiceType,
        invoiceMode,
        effectiveUser?.userId ?? null,
        effectiveUser?.territoryId ?? null
      )
      setManualInvoice(draft)
      setBuilderOpen(true)
    } finally {
      setIsSubmitting(false)
    }
  }
  const manualStatusLabel = selectedOutlet?.isClose
    ? 'Closed'
    : selectedOutlet?.isApproved
      ? 'Approved'
      : 'Pending'

  const handleManualSave = useCallback(
    async (payload: ManualSavePayload) => {
      try {
        const requestPayload = buildCreateInvoicePayload(
          payload,
          effectiveUser?.userId ?? null,
          selectedOutlet
        )
        const response = await createInvoice(requestPayload)
        const successMessage =
          response?.message ?? 'Manual invoice created successfully.'
        toast.success(successMessage)
        setBuilderOpen(false)
        setManualInvoice(null)
        setPayloadPreview(null)
      } catch (error) {
        let message = 'Failed to create manual invoice.'
        if (isAxiosError(error)) {
          message = error.response?.data?.message ?? message
        } else if (error instanceof Error) {
          message = error.message
        }
        toast.error(message)
      }
    },
    [selectedOutlet, effectiveUser?.userId]
  )

  return (
    <div className='space-y-6'>
      <Card className='border bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100'>
        <CardHeader className='space-y-1'>
          <CardTitle className='text-lg font-semibold'>
            Create New Invoice
          </CardTitle>
          <CardDescription className='text-slate-600 dark:text-slate-300'>
            Provide the base details before continuing to the item builder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 md:grid-cols-4'>
            <div className='space-y-2'>
              <Label
                htmlFor='manual-customer'
                className='text-sm font-medium text-slate-800 dark:text-slate-200'
              >
                Outlet Name
              </Label>
              <Select
                value={customerId}
                onValueChange={(value) => {
                  setCustomerId(value)
                  const found = outletLookup[value]
                  if (found) {
                    setSelectedOutlet({
                      ...found,
                      agencyCode:
                        found.agencyCode ?? effectiveUser?.agencyCode ?? null,
                      routeCode:
                        found.routeCode ?? effectiveUser?.routeCode ?? null,
                      agencyWarehouseId:
                        found.agencyWarehouseId ??
                        effectiveUser?.agencyWarehouseId ??
                        null,
                    })
                  } else {
                    setSelectedOutlet(null)
                  }
                }}
                disabled={isOutletLoading}
              >
                <SelectTrigger
                  id='manual-customer'
                  className='w-full min-w-0 bg-white dark:bg-slate-900'
                >
                  <SelectValue
                    placeholder={
                      isOutletLoading ? 'Loading outlets…' : 'Select Outlet'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {keyedOutlets.length ? (
                    keyedOutlets.map(({ key, outlet }) => (
                      <SelectItem key={key} value={key}>
                        {outlet.outletName ?? `Outlet ${key}`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem
                      value='__no-customers'
                      disabled
                      className='text-muted-foreground'
                    >
                      {isOutletLoading
                        ? 'Fetching outlets…'
                        : 'No outlets found for your territory.'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label
                htmlFor='manual-invoice-type'
                className='text-sm font-medium text-slate-800 dark:text-slate-200'
              >
                Invoice Type
              </Label>
              <Select value={invoiceType} onValueChange={setInvoiceType}>
                <SelectTrigger
                  id='manual-invoice-type'
                  className='w-full min-w-0 bg-white dark:bg-slate-900'
                >
                  <SelectValue placeholder='Select Type' />
                </SelectTrigger>
                <SelectContent>
                  {invoiceTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label
                htmlFor='manual-invoice-mode'
                className='text-sm font-medium text-slate-800 dark:text-slate-200'
              >
                Invoice Mode
              </Label>
              <Select value={invoiceMode} onValueChange={setInvoiceMode}>
                <SelectTrigger
                  id='manual-invoice-mode'
                  className='w-full min-w-0 bg-white dark:bg-slate-900'
                >
                  <SelectValue placeholder='Select Mode' />
                </SelectTrigger>
                <SelectContent>
                  {invoiceModeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex flex-col justify-end'>
              <Button
                type='button'
                size='lg'
                className='w-full gap-2'
                disabled={isProceedDisabled}
                onClick={handleProceed}
              >
                <ArrowRight className='h-4 w-4' />
                {isSubmitting ? 'Processing…' : 'Proceed'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {selectedOutlet ? (
        <Card className='border bg-white text-slate-900 shadow-lg dark:bg-slate-900 dark:text-slate-100'>
          <CardHeader className='space-y-4'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div className='flex items-start gap-4'>
                {selectedOutlet.imagePath ? (
                  <div className='h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'>
                    <img
                      src={selectedOutlet.imagePath}
                      alt={selectedOutlet.outletName ?? 'Outlet image'}
                      className='h-full w-full object-cover'
                      loading='lazy'
                    />
                  </div>
                ) : (
                  <div className='flex h-20 w-20 items-center justify-center rounded-xl border border-slate-200 bg-slate-200 text-xl font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'>
                    {selectedOutlet.outletName
                      ? selectedOutlet.outletName.charAt(0).toUpperCase()
                      : 'S'}
                  </div>
                )}
                <div>
                  <p className='text-sm text-slate-700 dark:text-slate-200'>
                    Selected Outlet
                  </p>
                  <h3 className='text-2xl font-semibold'>
                    {selectedOutlet.outletName}
                  </h3>
                  <p className='text-sm text-slate-700 dark:text-slate-200'>
                    {selectedOutlet.address1}
                    {selectedOutlet.address2
                      ? `, ${selectedOutlet.address2}`
                      : ''}
                    {selectedOutlet.address3
                      ? `, ${selectedOutlet.address3}`
                      : ''}
                  </p>
                </div>
              </div>
              <div className='flex flex-wrap gap-2'>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    selectedOutlet.isApproved
                      ? 'bg-amber-700 text-amber-100 dark:bg-amber-600'
                      : 'bg-slate-600 text-slate-100 dark:bg-slate-500'
                  }`}
                >
                  {selectedOutlet.isApproved ? 'Approved' : 'Not Approved'}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    selectedOutlet.isClose
                      ? 'bg-slate-700 text-slate-100 dark:bg-slate-600'
                      : 'bg-blue-900 text-blue-100 dark:bg-blue-800'
                  }`}
                >
                  {selectedOutlet.isClose ? 'Closed' : 'Open'}
                </span>
              </div>
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='rounded-xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-700 dark:bg-slate-800/60'>
                <p className='text-xs font-medium text-slate-700 dark:text-slate-200'>
                  Route & Territory
                </p>
                <p className='mt-1 text-sm font-semibold'>
                  {selectedOutlet.routeName ?? 'N/A'}
                </p>
                <p className='text-xs text-slate-700/80 dark:text-slate-300'>
                  Route Code: {selectedOutlet.routeCode ?? 'N/A'}
                </p>
                <p className='text-xs text-slate-700/80 dark:text-slate-300'>
                  Territory: {selectedOutlet.territoryName ?? 'N/A'}
                </p>
              </div>
              <div className='rounded-xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-700 dark:bg-slate-800/60'>
                <p className='text-xs font-medium text-slate-700 dark:text-slate-200'>
                  Codes
                </p>
                <p className='mt-1 text-sm font-semibold'>
                  Outlet: {selectedOutlet.outletCode ?? 'N/A'}
                </p>
                <p className='text-xs text-slate-700/80 dark:text-slate-300'>
                  Unique: {selectedOutlet.uniqueCode ?? 'N/A'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-3'>
              <div className='rounded-xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-700 dark:bg-slate-800/60'>
                <p className='text-xs font-medium text-slate-700 dark:text-slate-200'>
                  Contact
                </p>
                <p className='mt-2 text-sm font-semibold'>
                  {selectedOutlet.ownerName || 'No owner on file'}
                </p>
                <p className='text-xs text-slate-700/80 dark:text-slate-300'>
                  {selectedOutlet.mobileNo || 'No mobile'}
                </p>
              </div>
              <div className='rounded-xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-700 dark:bg-slate-800/60'>
                <p className='text-xs font-medium text-slate-700 dark:text-slate-200'>
                  Range & Display Order
                </p>
                <p className='mt-2 text-sm font-semibold'>
                  Range: {selectedOutlet.rangeName ?? 'N/A'}
                </p>
                <p className='text-xs text-slate-700/80 dark:text-slate-300'>
                  Sequence #{selectedOutlet.outletSequence ?? '--'}
                </p>
              </div>
              <div className='rounded-xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-700 dark:bg-slate-800/60'>
                <p className='text-xs font-medium text-slate-700 dark:text-slate-200'>
                  Geo Coordinates
                </p>
                <p className='mt-2 font-mono text-base font-semibold text-slate-900 dark:text-slate-100'>
                  {selectedOutlet.latitude?.toFixed(5) ?? '0.00000'},{' '}
                  {selectedOutlet.longitude?.toFixed(5) ?? '0.00000'}
                </p>
                <p className='text-xs text-slate-700/80 dark:text-slate-300'>
                  Updated {selectedOutlet.updated ?? 'N/A'}
                </p>
              </div>
            </div>
            {mapUrl ? (
              <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-800/60'>
                <div className='flex items-center justify-between border-b border-slate-200/70 px-4 py-2 text-slate-800 dark:border-slate-700'>
                  <div>
                    <p className='text-xs tracking-wide text-slate-900 uppercase dark:text-slate-200'>
                      Geo Coordinates
                    </p>
                    <p className='font-mono text-base font-semibold text-slate-900 dark:text-slate-100'>
                      {selectedOutlet.latitude?.toFixed(5)},{' '}
                      {selectedOutlet.longitude?.toFixed(5)}
                    </p>
                  </div>
                  <p className='text-xs text-slate-900/80 dark:text-slate-300'>
                    Updated {selectedOutlet.updated ?? 'N/A'}
                  </p>
                </div>
                <div className='h-64 bg-slate-50 shadow-inner dark:bg-slate-950'>
                  <iframe
                    title={`Outlet location for ${selectedOutlet.outletName}`}
                    src={mapUrl}
                    className='h-full w-full border-0'
                    loading='lazy'
                    referrerPolicy='no-referrer-when-downgrade'
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      <FullWidthDialog
        open={builderOpen}
        onOpenChange={(open) => {
          setBuilderOpen(open)
          if (!open) setPayloadPreview(null)
        }}
        title='Create Invoice'
        width='full'
      >
        {manualInvoice ? (
          <div className='space-y-4 p-4'>
            <BookingInvoiceDetailsHeader
              invoice={manualInvoice}
              status={manualStatusLabel}
              formatDate={formatManualDate}
              showInvoiceMeta={false}
            />
            <ManualInvoiceItemsTable
              invoice={manualInvoice}
              items={manualInvoice.invoiceDetailDTOList ?? []}
              onManualSave={handleManualSave}
              userId={user?.userId ?? null}
              onCancel={() => setBuilderOpen(false)}
            />
            {payloadPreview ? (
              <div className='rounded-lg border border-slate-200 bg-white/90 p-4 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900/40'>
                <div className='mb-2 flex items-center justify-between'>
                  <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                    Manual Invoice Payload Preview
                  </p>
                  <span className='text-[11px] text-slate-500 dark:text-slate-300'>
                    Generated when you clicked Create Invoice
                  </span>
                </div>
                <pre className='max-h-[320px] overflow-auto rounded bg-slate-900/90 px-3 py-3 font-mono text-[11px] text-slate-100 dark:bg-slate-800/80'>
                  {payloadPreview}
                </pre>
              </div>
            ) : null}
          </div>
        ) : (
          <div className='text-muted-foreground text-sm'>
            Select outlet and proceed to build a manual invoice.
          </div>
        )}
      </FullWidthDialog>
    </div>
  )
}

export default ManualInvoice
