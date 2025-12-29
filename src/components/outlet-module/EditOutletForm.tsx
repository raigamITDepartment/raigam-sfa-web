import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type EditOutletFormValues = {
  id?: number | string
  outletName?: string
  uniqueCode?: string
  displayOrder?: number | string
  ownerName?: string
  mobileNo?: string
  address1?: string
  address2?: string
  address3?: string
  outletCategoryName?: string
  routeName?: string
  rangeName?: string
  openTime?: string
  closeTime?: string
  latitude?: number | string
  longitude?: number | string
  vatNum?: string
  created?: string
  isApproved?: boolean
  isClose?: boolean
  isNew?: boolean
  imagePath?: string | null
}

type EditOutletFormProps = {
  outlet: EditOutletFormValues
  onSubmit?: (values: EditOutletFormValues) => void
}

const toStringValue = (value: unknown) =>
  value === null || value === undefined ? '' : String(value)

export function EditOutletForm({ outlet, onSubmit }: EditOutletFormProps) {
  const [formValues, setFormValues] = useState<EditOutletFormValues>(() => ({
    ...outlet,
  }))
  const [imageOpen, setImageOpen] = useState(false)
  const [imageLoading, setImageLoading] = useState(Boolean(outlet.imagePath))

  const outletIdText = useMemo(
    () => (outlet.id !== null && outlet.id !== undefined ? outlet.id : '-'),
    [outlet.id]
  )

  const handleChange = (
    key: keyof EditOutletFormValues,
    value: string | boolean
  ) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = () => {
    onSubmit?.(formValues)
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-start justify-between gap-6'>
        <div>
          <h2 className='text-lg font-semibold text-slate-900'>
            Edit Outlet (ID: {outletIdText})
          </h2>
          <p className='text-sm text-slate-500'>
            Review and update outlet details.
          </p>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]'>
        <div className='space-y-4'>
          <Card className='flex flex-col items-center gap-3 p-4 shadow-sm'>
            <button
              type='button'
              className='relative h-44 w-full overflow-hidden rounded-md border bg-slate-50 transition hover:opacity-90 disabled:cursor-default'
              onClick={() => {
                if (outlet.imagePath) setImageOpen(true)
              }}
              disabled={!outlet.imagePath}
              aria-label='View outlet image'
            >
              {imageLoading && (
                <div className='absolute inset-0 flex items-center justify-center bg-white/70 text-xs text-slate-500'>
                  Loading image...
                </div>
              )}
              {outlet.imagePath ? (
                <img
                  src={outlet.imagePath}
                  alt={outlet.outletName ?? 'Outlet image'}
                  className='h-full w-full object-cover'
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                />
              ) : (
                <div className='flex h-full items-center justify-center text-xs text-slate-400'>
                  Outlet Image
                </div>
              )}
            </button>
            <span className='text-xs text-slate-500'>Outlet Image</span>
          </Card>

          <Card className='p-3 shadow-sm'>
            <div className='overflow-hidden rounded-md border'>
              <iframe
                title='Outlet location'
                className='h-48 w-full'
                loading='lazy'
                referrerPolicy='no-referrer-when-downgrade'
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  `${formValues.latitude ?? ''},${formValues.longitude ?? ''}`
                )}&z=16&output=embed`}
              />
            </div>
            <span className='mt-2 block text-center text-xs text-slate-500'>
              Outlet Location
            </span>
          </Card>
        </div>

        <div className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <Label>Outlet Name</Label>
              <Input
                value={toStringValue(formValues.outletName)}
                onChange={(event) =>
                  handleChange('outletName', event.target.value)
                }
                className='h-10'
              />
            </div>
            <div className='space-y-2'>
              <Label>Unique Code</Label>
              <Input
                value={toStringValue(formValues.uniqueCode)}
                onChange={(event) =>
                  handleChange('uniqueCode', event.target.value)
                }
                className='h-10'
              />
            </div>
            <div className='space-y-2'>
              <Label>Outlet Display Order</Label>
              <Input
                value={toStringValue(formValues.displayOrder)}
                onChange={(event) =>
                  handleChange('displayOrder', event.target.value)
                }
                className='h-10'
              />
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <Label>Owner Name</Label>
              <Input
                value={toStringValue(formValues.ownerName)}
                onChange={(event) =>
                  handleChange('ownerName', event.target.value)
                }
                className='h-10'
              />
            </div>
            <div className='space-y-2'>
              <Label>Mobile No</Label>
              <Input
                value={toStringValue(formValues.mobileNo)}
                onChange={(event) =>
                  handleChange('mobileNo', event.target.value)
                }
                className='h-10'
              />
            </div>
            <div />
          </div>

          <div className='grid gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <Label>Address 1</Label>
              <Input
                value={toStringValue(formValues.address1)}
                onChange={(event) =>
                  handleChange('address1', event.target.value)
                }
                className='h-10'
              />
            </div>
            <div className='space-y-2'>
              <Label>Address 2</Label>
              <Input
                value={toStringValue(formValues.address2)}
                onChange={(event) =>
                  handleChange('address2', event.target.value)
                }
                className='h-10'
              />
            </div>
            <div className='space-y-2'>
              <Label>Address 3</Label>
              <Input
                value={toStringValue(formValues.address3)}
                onChange={(event) =>
                  handleChange('address3', event.target.value)
                }
                className='h-10'
              />
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <Label>Category</Label>
              <Input
                value={toStringValue(formValues.outletCategoryName)}
                onChange={(event) =>
                  handleChange('outletCategoryName', event.target.value)
                }
                className='h-10'
              />
            </div>
            <div className='space-y-2'>
              <Label>Route</Label>
              <Input
                value={toStringValue(formValues.routeName)}
                onChange={(event) =>
                  handleChange('routeName', event.target.value)
                }
                className='h-10'
              />
            </div>
            <div className='space-y-2'>
              <Label>Range</Label>
              <Input
                value={toStringValue(formValues.rangeName)}
                onChange={(event) =>
                  handleChange('rangeName', event.target.value)
                }
                className='h-10'
              />
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-6'>
            <div className='space-y-2'>
              <Label>Open Time</Label>
              <Input
                value={toStringValue(formValues.openTime)}
                onChange={(event) =>
                  handleChange('openTime', event.target.value)
                }
                className='h-10'
              />
            </div>
            <div className='space-y-2'>
              <Label>Close Time</Label>
              <Input
                value={toStringValue(formValues.closeTime)}
                onChange={(event) =>
                  handleChange('closeTime', event.target.value)
                }
                className='h-10'
              />
            </div>
            <div className='space-y-2'>
              <Label>Latitude</Label>
              <Input
                value={toStringValue(formValues.latitude)}
                onChange={(event) =>
                  handleChange('latitude', event.target.value)
                }
                className='h-10'
              />
            </div>
            <div className='space-y-2'>
              <Label>Longitude</Label>
              <Input
                value={toStringValue(formValues.longitude)}
                onChange={(event) =>
                  handleChange('longitude', event.target.value)
                }
                className='h-10'
              />
            </div>
            <div className='space-y-2'>
              <Label>VAT Number</Label>
              <Input
                value={toStringValue(formValues.vatNum)}
                onChange={(event) => handleChange('vatNum', event.target.value)}
                className='h-10'
              />
            </div>
            <div className='space-y-2'>
              <Label>Created Date&amp;Time</Label>
              <Input
                value={toStringValue(formValues.created)}
                onChange={(event) =>
                  handleChange('created', event.target.value)
                }
                className='h-10'
              />
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <Label>Is Approved</Label>
              <div className='flex items-center gap-2 rounded-md border border-dashed p-3'>
                <Checkbox
                  checked={Boolean(formValues.isApproved)}
                  onCheckedChange={(value) =>
                    handleChange('isApproved', Boolean(value))
                  }
                  id='outlet-approved'
                />
                <Label htmlFor='outlet-approved' className='text-sm'>
                  Approved
                </Label>
              </div>
            </div>
            <div className='space-y-2'>
              <Label>Outlet Status</Label>
              <div className='flex items-center gap-2 rounded-md border border-dashed p-3'>
                <Checkbox
                  checked={Boolean(formValues.isClose)}
                  onCheckedChange={(value) =>
                    handleChange('isClose', Boolean(value))
                  }
                  id='outlet-closed'
                />
                <Label htmlFor='outlet-closed' className='text-sm'>
                  Is close
                </Label>
              </div>
            </div>
            <div className='space-y-2'>
              <Label>Outlet Status</Label>
              <div className='flex items-center gap-2 rounded-md border border-dashed p-3'>
                <Checkbox
                  checked={Boolean(formValues.isNew)}
                  onCheckedChange={(value) =>
                    handleChange('isNew', Boolean(value))
                  }
                  id='outlet-new'
                />
                <Label htmlFor='outlet-new' className='text-sm'>
                  Is new
                </Label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='flex justify-end'>
        <Button className='min-w-[220px]' onClick={handleSubmit}>
          Update Outlet
        </Button>
      </div>
      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className='max-w-5xl p-0'>
          <DialogHeader className='border-b px-6 py-4'>
            <DialogTitle>Outlet Image</DialogTitle>
          </DialogHeader>
          <div className='max-h-[75vh] overflow-auto bg-black/95 p-4'>
            {outlet.imagePath ? (
              <img
                src={outlet.imagePath}
                alt={outlet.outletName ?? 'Outlet image'}
                className='mx-auto max-h-[70vh] w-auto max-w-full object-contain'
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
