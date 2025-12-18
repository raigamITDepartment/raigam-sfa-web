import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAllOutletsByTerritoryId } from '@/services/userDemarcation/endpoints'
import { useAppSelector } from '@/store/hooks'
import type { OutletDTO } from '@/types/demarcation'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
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

const invoiceTypeOptions = [
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Agency', value: 'AGENCY' },
  { label: 'Company', value: 'COMPANY' },
]

const invoiceModeOptions = [
  { label: 'Booking', value: 'BOOKING' },
  { label: 'Actual', value: 'ACTUAL' },
]

type ManualOutlet = OutletDTO & {
  outletId?: number | string
  outletCode?: string
  outletName?: string
  uniqueCode?: string
  outletCategoryName?: string
  address1?: string
  address2?: string
  address3?: string
  latitude?: number
  longitude?: number
  imagePath?: string
  isApproved?: boolean
  isClose?: boolean
  routeName?: string
  territoryName?: string
  ownerName?: string
  mobileNo?: string
  rangeName?: string
  outletSequence?: number
  updated?: string
}

const ManualInvoice = () => {
  const user = useAppSelector((state) => state.auth.user)
  const [customerId, setCustomerId] = useState<string>('')
  const [invoiceType, setInvoiceType] = useState<string>('')
  const [invoiceMode, setInvoiceMode] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedOutlet, setSelectedOutlet] = useState<ManualOutlet | null>(null)

  const { data: outlets = [], isLoading: isOutletLoading } = useQuery<
    ManualOutlet[]
  >({
    queryKey: ['manual-invoice-outlets', user?.territoryId],
    enabled: Boolean(user?.territoryId),
    queryFn: async () => {
      const res = await getAllOutletsByTerritoryId(user?.territoryId ?? 0)
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
      sortedOutlets.map((outlet, idx) => ({
        key: String(
          outlet.outletId ??
            outlet.outletCode ??
            outlet.uniqueCode ??
            outlet.outletName ??
            idx
        ),
        outlet,
      })),
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
    if (isProceedDisabled) return
    setIsSubmitting(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 400))
      toast.success('Manual invoice wizard coming soon.')
    } finally {
      setIsSubmitting(false)
    }
  }

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
                  setSelectedOutlet(outletLookup[value] ?? null)
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
                  <p className='text-sm text-slate-700 dark:text-slate-200'>Selected Outlet</p>
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
                  Territory: {selectedOutlet.territoryName ?? 'N/A'}
                </p>
              </div>
              <div className='rounded-xl border border-slate-200 bg-white/70 p-4 backdrop-blur dark:border-slate-700 dark:bg-slate-800/60'>
                <p className='text-xs font-medium text-slate-700 dark:text-slate-200'>Codes</p>
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
                <p className='text-xs font-medium text-slate-700 dark:text-slate-200'>Contact</p>
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
                    <p className='text-xs uppercase tracking-wide text-slate-900 dark:text-slate-200'>
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
    </div>
  )
}

export default ManualInvoice
