import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarIcon, Check, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  type ApiResponse,
  type SubChannelDTO,
  getAllSubChannel,
} from '@/services/userDemarcationApi'

type PriceRow = {
  id: string
  subChannelId: string
  price: string
  dateRange?: DateRange
}

const steps = [
  {
    id: 'basic',
    title: 'Basic Info',
    description: 'Item identity and ownership',
  },
  {
    id: 'category',
    title: 'Category',
    description: 'Classification and flavor',
  },
  {
    id: 'pricing',
    title: 'Pricing',
    description: 'Channel pricing and validity',
  },
  {
    id: 'measurement',
    title: 'Measurement',
    description: 'UOM, size, and volume',
  },
]

const createPriceRow = (): PriceRow => ({
  id: `price-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  subChannelId: '',
  price: '',
  dateRange: undefined,
})

const pad2 = (value: number) => String(value).padStart(2, '0')
const formatLocalDate = (value: Date) =>
  `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`
const formatRangeLabel = (range?: DateRange) => {
  if (!range?.from && !range?.to) return 'Select date range'
  if (range?.from && range?.to) {
    return `${formatLocalDate(range.from)} - ${formatLocalDate(range.to)}`
  }
  return range?.from ? formatLocalDate(range.from) : 'Select date range'
}

const AddItem = () => {
  const [activeStep, setActiveStep] = useState(0)
  const [subChannelId, setSubChannelId] = useState('')
  const [company, setCompany] = useState('')
  const [mainCategory, setMainCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [subSubCategory, setSubSubCategory] = useState('')
  const [flavor, setFlavor] = useState('')
  const [uom, setUom] = useState('')
  const [size, setSize] = useState('')
  const [volume, setVolume] = useState('')
  const [priceRows, setPriceRows] = useState<PriceRow[]>([createPriceRow()])

  const { data: subChannelsData = [], isLoading: isSubChannelLoading } =
    useQuery({
      queryKey: ['user-demarcation', 'sub-channels'],
      queryFn: async () => {
        const res = (await getAllSubChannel()) as ApiResponse<SubChannelDTO[]>
        return res.payload ?? []
      },
    })

  const subChannelOptions = useMemo(
    () =>
      subChannelsData
        .map((item) => ({
          value: String(item.id),
          label:
            item.subChannelName ??
            item.subChannelCode ??
            `Sub Channel ${item.id}`,
        }))
        .filter(
          (option): option is { value: string; label: string } =>
            Boolean(option.value)
        ),
    [subChannelsData]
  )

  const progress = steps.length > 1 ? (activeStep / (steps.length - 1)) * 100 : 0

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0))
  }

  const handleAddPriceRow = () => {
    setPriceRows((prev) => [...prev, createPriceRow()])
  }

  const handleRemovePriceRow = (id: string) => {
    setPriceRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev))
  }

  const handleUpdatePriceRow = (id: string, next: Partial<PriceRow>) => {
    setPriceRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...next } : row))
    )
  }

  return (
    <div className='space-y-6'>
      <Card className='border-muted/70'>
        <CardHeader className='space-y-2'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <CardTitle className='text-lg'>Add Item</CardTitle>
              <CardDescription>
                Complete all four steps to create a new item.
              </CardDescription>
            </div>
            <div className='text-sm text-muted-foreground'>
              Step {activeStep + 1} of {steps.length}
            </div>
          </div>
          <div className='relative mt-2'>
            <div className='absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-border' />
            <div
              className='absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-primary transition-all duration-300'
              style={{ width: `${progress}%` }}
            />
            <div className='grid gap-3 md:grid-cols-4'>
              {steps.map((step, index) => {
                const isActive = index === activeStep
                const isComplete = index < activeStep
                return (
                  <button
                    key={step.id}
                    type='button'
                    onClick={() => setActiveStep(index)}
                    className={cn(
                      'group relative z-10 flex w-full items-center gap-3 rounded-lg border bg-background px-3 py-3 text-left shadow-sm transition',
                      isActive && 'border-primary/50 shadow-md',
                      isComplete && 'border-primary/40'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold',
                        isComplete && 'border-primary bg-primary text-white',
                        isActive && 'border-primary/60 bg-primary/10 text-primary',
                        !isActive &&
                          !isComplete &&
                          'border-muted-foreground/40 text-muted-foreground'
                      )}
                    >
                      {isComplete ? <Check className='h-4 w-4' /> : index + 1}
                    </span>
                    <span className='flex flex-col'>
                      <span className='text-sm font-semibold'>{step.title}</span>
                      <span className='text-xs text-muted-foreground'>
                        {step.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div
        key={activeStep}
        className='animate-in fade-in slide-in-from-bottom-2 duration-300'
      >
        {activeStep === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Basic Info</CardTitle>
              <CardDescription>
                Provide core identifiers for the item.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='item-name'>Name</Label>
                  <Input id='item-name' placeholder='Name' />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='sap-code'>SAP Code</Label>
                  <Input id='sap-code' placeholder='SAP Code' />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='ln-code'>LN Code</Label>
                  <Input id='ln-code' placeholder='LN Code' />
                </div>
                <div className='space-y-2'>
                  <Label>Sub Channel</Label>
                  <Select value={subChannelId} onValueChange={setSubChannelId}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select...' />
                    </SelectTrigger>
                    <SelectContent>
                      {isSubChannelLoading ? (
                        <SelectItem value='loading' disabled>
                          Loading...
                        </SelectItem>
                      ) : null}
                      {!isSubChannelLoading && subChannelOptions.length === 0 ? (
                        <SelectItem value='empty' disabled>
                          No sub channels found
                        </SelectItem>
                      ) : null}
                      {!isSubChannelLoading
                        ? subChannelOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))
                        : null}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label>Company</Label>
                  <Select value={company} onValueChange={setCompany}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select...' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='RMS'>RMS</SelectItem>
                      <SelectItem value='DLS'>DLS</SelectItem>
                      <SelectItem value='RWS'>RWS</SelectItem>
                      <SelectItem value='TNC'>TNC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeStep === 1 ? (
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Category</CardTitle>
              <CardDescription>Classify the item for reporting.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label>Main Category</Label>
                  <Select value={mainCategory} onValueChange={setMainCategory}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select Main Category' />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value='food'>Food</SelectItem>
                      <SelectItem value='drinks'>Drinks</SelectItem>
                      <SelectItem value='condiment'>Food Condiment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                <div className='space-y-2'>
                  <Label>Sub Category</Label>
                  <Select value={subCategory} onValueChange={setSubCategory}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select Sub Category' />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value='premium'>Premium</SelectItem>
                      <SelectItem value='budget'>Budget</SelectItem>
                      <SelectItem value='bulk'>Bulk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                <div className='space-y-2'>
                  <Label>Sub Sub Category</Label>
                  <Select value={subSubCategory} onValueChange={setSubSubCategory}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select Sub Sub Category' />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value='special'>Special</SelectItem>
                      <SelectItem value='standard'>Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                <div className='space-y-2'>
                  <Label>Flavor</Label>
                  <Select value={flavor} onValueChange={setFlavor}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select Flavor' />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value='none'>None</SelectItem>
                      <SelectItem value='chicken'>Chicken</SelectItem>
                      <SelectItem value='prawn'>Prawn</SelectItem>
                      <SelectItem value='curry'>Curry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeStep === 2 ? (
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Pricing</CardTitle>
              <CardDescription>Define price by sub channel.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              {priceRows.map((row, index) => (
                <div key={row.id} className='space-y-4'>
                  <div className='grid gap-4 md:grid-cols-[1.1fr_0.7fr_1fr_auto] md:items-end'>
                    <div className='space-y-2'>
                      <Label>Sub Channel</Label>
                      <Select
                        value={row.subChannelId}
                        onValueChange={(value) =>
                          handleUpdatePriceRow(row.id, { subChannelId: value })
                        }
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select...' />
                        </SelectTrigger>
                        <SelectContent>
                          {isSubChannelLoading ? (
                            <SelectItem value='loading' disabled>
                              Loading...
                            </SelectItem>
                          ) : null}
                          {!isSubChannelLoading && subChannelOptions.length === 0 ? (
                            <SelectItem value='empty' disabled>
                              No sub channels found
                            </SelectItem>
                          ) : null}
                          {!isSubChannelLoading
                            ? subChannelOptions.map((option) => (
                                <SelectItem
                                  key={`${row.id}-${option.value}`}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))
                            : null}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='space-y-2'>
                      <Label>Price</Label>
                      <Input
                        placeholder='Rs.'
                        value={row.price}
                        onChange={(event) =>
                          handleUpdatePriceRow(row.id, {
                            price: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label>Price Effective Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant='outline'
                            className='w-full justify-between font-normal'
                          >
                            <span className='truncate'>
                              {formatRangeLabel(row.dateRange)}
                            </span>
                            <CalendarIcon className='h-4 w-4 text-muted-foreground' />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-auto p-0' align='start'>
                          <Calendar
                            mode='range'
                            selected={row.dateRange}
                            onSelect={(range) =>
                              handleUpdatePriceRow(row.id, { dateRange: range })
                            }
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className='flex justify-end md:justify-center'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='mt-1'
                        onClick={() => handleRemovePriceRow(row.id)}
                        aria-label={`Remove price row ${index + 1}`}
                      >
                        <Trash2 className='h-4 w-4 text-muted-foreground' />
                      </Button>
                    </div>
                  </div>
                  {index < priceRows.length - 1 ? <Separator /> : null}
                </div>
              ))}
              <Button
                type='button'
                variant='ghost'
                className='h-auto px-0 text-primary'
                onClick={handleAddPriceRow}
              >
                <Plus className='h-4 w-4' />
                Add Price
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {activeStep === 3 ? (
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Measurement</CardTitle>
              <CardDescription>
                Capture the unit, size, and volume.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label>UOM</Label>
                  <Select value={uom} onValueChange={setUom}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select...' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='Pack'>Pack</SelectItem>
                      <SelectItem value='Bottle'>Bottle</SelectItem>
                      <SelectItem value='Bulk'>Bulk</SelectItem>
                      <SelectItem value='KG'>KG</SelectItem>
                      <SelectItem value='G'>G</SelectItem>
                      <SelectItem value='L'>L</SelectItem>
                      <SelectItem value='ML'>ML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label>Size</Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select...' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='Small'>Small</SelectItem>
                      <SelectItem value='Normal'>Normal</SelectItem>
                      <SelectItem value='Large'>Large</SelectItem>
                      <SelectItem value='Extra Large'>Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label>Volume</Label>
                  <Select value={volume} onValueChange={setVolume}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select...' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='50'>50</SelectItem>
                      <SelectItem value='100'>100</SelectItem>
                      <SelectItem value='250'>250</SelectItem>
                      <SelectItem value='500'>500</SelectItem>
                      <SelectItem value='1000'>1000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardFooter className='flex flex-wrap items-center justify-between gap-3'>
          <Button
            type='button'
            variant='outline'
            onClick={handleBack}
            disabled={activeStep === 0}
          >
            <ChevronLeft className='h-4 w-4' />
            Back
          </Button>
          <div className='flex items-center gap-2'>
            {activeStep < steps.length - 1 ? (
              <Button type='button' onClick={handleNext}>
                Next
                <ChevronRight className='h-4 w-4' />
              </Button>
            ) : (
              <Button type='button'>Save Item</Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export default AddItem
