import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarIcon, Check, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { AxiosError } from 'axios'
import { toast } from 'sonner'
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
  addItem,
  getAllFlavour,
  getAllItemMaster,
  getItemBrands,
  getItemMainCategories,
  getSubcategoryByMaincat,
  getSubSubCategorybySubCatId,
} from '@/services/sales/itemApi'
import {
  type ApiResponse,
  type SubChannelDTO,
  getAllSubChannel,
} from '@/services/userDemarcationApi'
import { useAppSelector } from '@/store/hooks'

type PriceRow = {
  id: string
  subChannelId: string
  price: string
  dateRange?: DateRange
}

type PriceRowErrors = {
  subChannelId?: string
  price?: string
  dateRange?: string
}

type AddItemFormErrors = {
  itemName?: string
  sapCode?: string
  lnCode?: string
  subChannelId?: string
  company?: string
  mainCategory?: string
  subCategory?: string
  subSubCategory?: string
  flavor?: string
  priceRows?: Record<string, PriceRowErrors>
  uom?: string
  size?: string
  volume?: string
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

const BASE_UOM_OPTIONS = [
  'Pack',
  'Bottle',
  'Box',
  'Pack&Bundle',
  'Bulk',
  'Each',
  'Backet',
  'Can',
  'Mattress',
  'Pillow',
]

const BASE_SIZE_OPTIONS = [
  'Normal',
  'Small',
  'Medium',
  'Large',
  '72*36',
  '72*48',
  '72*60',
  '16*24',
  '18*27',
  '20*30',
  '72*36*4',
  '72*36*6',
  '72*48*4',
  '72*48*6',
  '72*54',
  '72*60*4',
  '72*60*6',
  '72*72',
  '72*72*6',
  '72*75',
  '72*75*6',
  '72*78',
  '72*78*6',
  '72*84',
  '72*84*6',
  '75*36',
  '75*36*6',
  '75*48',
  '75*48*6',
  '75*60',
  '75*60*6',
  '75*72',
  '75*75',
  '75*78',
  '78*36',
  '78*36*6',
  '78*48',
  '78*48*6',
  '78*60',
  '78*60*6',
  '78*72',
  '78*78',
  '78*84',
  '84*60*6',
]

const BASE_VOLUME_OPTIONS = [
  { label: 'L', value: '1' },
  { label: 'ML', value: '2' },
  { label: 'G', value: '3' },
  { label: 'KG', value: '4' },
  { label: 'Inch', value: '5' },
]

const VOLUME_MEASUREMENT_MAP: Record<string, string> = {
  '1': 'l',
  '2': 'ml',
  '3': 'g',
  '4': 'kg',
  '5': 'inch',
}

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
const parseId = (value: string) => {
  if (!value) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

const AddItem = () => {
  const [activeStep, setActiveStep] = useState(0)
  const [itemName, setItemName] = useState('')
  const [sapCode, setSapCode] = useState('')
  const [lnCode, setLnCode] = useState('')
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
  const [errors, setErrors] = useState<AddItemFormErrors>({})
  const selectedMainCategoryId = parseId(mainCategory)
  const selectedSubCategoryId = parseId(subCategory)
  const user = useAppSelector((state) => state.auth.user)
  const queryClient = useQueryClient()

  const { data: subChannelsData = [], isLoading: isSubChannelLoading } =
    useQuery({
      queryKey: ['user-demarcation', 'sub-channels'],
      queryFn: async () => {
        const res = (await getAllSubChannel()) as ApiResponse<SubChannelDTO[]>
        return res.payload ?? []
      },
    })
  const { data: itemBrandsData = [], isLoading: isItemBrandsLoading } = useQuery(
    {
      queryKey: ['sales', 'item-brands'],
      queryFn: async () => {
        const res = await getItemBrands()
        return (res.payload ?? []).filter((item) => item.isActive)
      },
    }
  )
  const { data: mainCategoriesData = [], isLoading: isMainCategoryLoading } =
    useQuery({
      queryKey: ['sales', 'item-main-categories'],
      queryFn: async () => {
        const res = await getItemMainCategories()
        return (res.payload ?? []).filter((item) => item.isActive)
      },
    })
  const { data: subCategoriesData = [], isLoading: isSubCategoryLoading } =
    useQuery({
      queryKey: ['sales', 'item-sub-categories', selectedMainCategoryId],
      enabled: selectedMainCategoryId !== null,
      queryFn: async () => {
        if (selectedMainCategoryId === null) return []
        const res = await getSubcategoryByMaincat(selectedMainCategoryId)
        return (res.payload ?? []).filter((item) => item.isActive)
      },
    })
  const { data: subSubCategoriesData = [], isLoading: isSubSubCategoryLoading } =
    useQuery({
      queryKey: ['sales', 'item-sub-sub-categories', selectedSubCategoryId],
      enabled: selectedSubCategoryId !== null,
      queryFn: async () => {
        if (selectedSubCategoryId === null) return []
        const res = await getSubSubCategorybySubCatId(selectedSubCategoryId)
        return (res.payload ?? []).filter((item) => item.isActive)
      },
    })
  const { data: flavoursData = [], isLoading: isFlavourLoading } = useQuery({
    queryKey: ['sales', 'item-flavours'],
    queryFn: async () => {
      const res = await getAllFlavour()
      return (res.payload ?? []).filter((item) => item.isActive)
    },
  })
  const { data: itemMasterData = [], isLoading: isUomLoading } = useQuery({
    queryKey: ['sales', 'item-master-uom-options'],
    queryFn: async () => {
      const res = await getAllItemMaster()
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
  const itemBrandsOptions = useMemo(
    () =>
      itemBrandsData
        .map((item) => ({
          value: String(item.id),
          label: item.itemTypeName?.trim()
            ? item.itemTypeName
            : item.itemType?.trim()
              ? item.itemType
              : `Brand ${item.id}`,
        }))
        .filter(
          (option): option is { value: string; label: string } =>
            Boolean(option.value)
        ),
    [itemBrandsData]
  )
  const mainCategoryOptions = useMemo(
    () =>
      mainCategoriesData
        .map((item) => ({
          value: String(item.id),
          label: item.itemMainCat?.trim()
            ? item.itemMainCat
            : `Main Category ${item.id}`,
        }))
        .filter(
          (option): option is { value: string; label: string } =>
            Boolean(option.value)
        ),
    [mainCategoriesData]
  )
  const subCategoryOptions = useMemo(
    () =>
      subCategoriesData
        .map((item) => ({
          value: String(item.id),
          label: item.subCatOneName?.trim()
            ? item.subCatOneName
            : `Sub Category ${item.id}`,
        }))
        .filter(
          (option): option is { value: string; label: string } =>
            Boolean(option.value)
        ),
    [subCategoriesData]
  )
  const subSubCategoryOptions = useMemo(
    () =>
      subSubCategoriesData
        .map((item) => ({
          value: String(item.id),
          label: item.subCatTwoName?.trim()
            ? item.subCatTwoName
            : `Sub Sub Category ${item.id}`,
        }))
        .filter(
          (option): option is { value: string; label: string } =>
            Boolean(option.value)
        ),
    [subSubCategoriesData]
  )
  const flavourOptions = useMemo(
    () =>
      flavoursData
        .map((item) => ({
          value: String(item.id),
          label: item.subCatThreeName?.trim()
            ? item.subCatThreeName
            : `Flavour ${item.id}`,
        }))
        .filter(
          (option): option is { value: string; label: string } =>
            Boolean(option.value)
        ),
    [flavoursData]
  )
  const uomOptions = useMemo(
    () => {
      const fromApi = itemMasterData
        .map((item) => item.unitOfMeasure?.trim() ?? '')
        .filter(Boolean)
      const merged = [...BASE_UOM_OPTIONS, ...fromApi]
      const seen = new Set<string>()
      const unique = merged.filter((option) => {
        const key = option.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      return unique.map((option) => ({ value: option, label: option }))
    },
    [itemMasterData]
  )

  const getErrorMessage = (error: unknown) => {
    if (error instanceof AxiosError) {
      const apiMessage = (
        error.response?.data as { message?: string; title?: string } | undefined
      )
      if (apiMessage?.message) return apiMessage.message
      if (apiMessage?.title) return apiMessage.title
    }
    return error instanceof Error ? error.message : 'Failed to save item'
  }

  const resetForm = () => {
    setItemName('')
    setSapCode('')
    setLnCode('')
    setSubChannelId('')
    setCompany('')
    setMainCategory('')
    setSubCategory('')
    setSubSubCategory('')
    setFlavor('')
    setUom('')
    setSize('')
    setVolume('')
    setPriceRows([createPriceRow()])
    setErrors({})
    setActiveStep(0)
  }

  const addItemMutation = useMutation({
    mutationFn: addItem,
    onSuccess: (response) => {
      toast.success(response?.message ?? 'Item added successfully')
      queryClient.invalidateQueries({ queryKey: ['item-master'] })
      resetForm()
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error))
    },
  })

  const clearFieldError = (field: keyof Omit<AddItemFormErrors, 'priceRows'>) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      return { ...prev, [field]: undefined }
    })
  }

  const clearPriceRowError = (id: string, field: keyof PriceRowErrors) => {
    setErrors((prev) => {
      const rowErrors = prev.priceRows?.[id]
      if (!rowErrors?.[field]) return prev

      const nextRowErrors: PriceRowErrors = { ...rowErrors, [field]: undefined }
      const nextPriceRows = { ...(prev.priceRows ?? {}) }
      const hasAnyError = Boolean(
        nextRowErrors.subChannelId || nextRowErrors.price || nextRowErrors.dateRange
      )

      if (hasAnyError) {
        nextPriceRows[id] = nextRowErrors
      } else {
        delete nextPriceRows[id]
      }

      return {
        ...prev,
        priceRows: Object.keys(nextPriceRows).length > 0 ? nextPriceRows : undefined,
      }
    })
  }

  const buildValidationErrors = (maxStep = steps.length - 1): AddItemFormErrors => {
    const nextErrors: AddItemFormErrors = {}

    if (maxStep >= 0) {
      if (!itemName.trim()) nextErrors.itemName = 'Name is required'
      if (!sapCode.trim()) nextErrors.sapCode = 'SAP Code is required'
      if (!lnCode.trim()) nextErrors.lnCode = 'LN Code is required'
      if (lnCode.trim() && Number.isNaN(Number(lnCode.trim()))) {
        nextErrors.lnCode = 'LN Code must be a valid number'
      }
      if (!subChannelId) nextErrors.subChannelId = 'Sub Channel is required'
      if (!company) nextErrors.company = 'Company is required'
    }

    if (maxStep >= 1) {
      if (!mainCategory) nextErrors.mainCategory = 'Main Category is required'
      if (!subCategory) nextErrors.subCategory = 'Sub Category is required'
      if (!subSubCategory) nextErrors.subSubCategory = 'Sub Sub Category is required'
      if (!flavor) nextErrors.flavor = 'Flavor is required'
    }

    if (maxStep >= 2) {
      const priceRowErrors: Record<string, PriceRowErrors> = {}
      priceRows.forEach((row) => {
        const rowErrors: PriceRowErrors = {}

        if (!row.subChannelId) rowErrors.subChannelId = 'Sub Channel is required'
        if (!row.price.trim()) rowErrors.price = 'Price is required'
        if (row.price.trim() && Number.isNaN(Number(row.price.trim()))) {
          rowErrors.price = 'Price must be a valid number'
        }
        if (!row.dateRange?.from || !row.dateRange?.to) {
          rowErrors.dateRange = 'Price Effective Date is required'
        }

        if (rowErrors.subChannelId || rowErrors.price || rowErrors.dateRange) {
          priceRowErrors[row.id] = rowErrors
        }
      })
      if (Object.keys(priceRowErrors).length > 0) nextErrors.priceRows = priceRowErrors
    }

    if (maxStep >= 3) {
      if (!uom) nextErrors.uom = 'UOM is required'
      if (!size) nextErrors.size = 'Size is required'
      if (!volume) nextErrors.volume = 'Volume is required'
    }

    return nextErrors
  }

  const stepHasErrors = (stepIndex: number, nextErrors: AddItemFormErrors) => {
    if (stepIndex === 0) {
      return Boolean(
        nextErrors.itemName ||
          nextErrors.sapCode ||
          nextErrors.lnCode ||
          nextErrors.subChannelId ||
          nextErrors.company
      )
    }
    if (stepIndex === 1) {
      return Boolean(
        nextErrors.mainCategory ||
          nextErrors.subCategory ||
          nextErrors.subSubCategory ||
          nextErrors.flavor
      )
    }
    if (stepIndex === 2) {
      return Boolean(nextErrors.priceRows && Object.keys(nextErrors.priceRows).length > 0)
    }

    return Boolean(nextErrors.uom || nextErrors.size || nextErrors.volume)
  }

  const getFirstInvalidStep = (nextErrors: AddItemFormErrors) => {
    if (stepHasErrors(0, nextErrors)) return 0
    if (stepHasErrors(1, nextErrors)) return 1
    if (stepHasErrors(2, nextErrors)) return 2
    if (stepHasErrors(3, nextErrors)) return 3
    return null
  }

  const progress = steps.length > 1 ? (activeStep / (steps.length - 1)) * 100 : 0

  const handleNext = () => {
    const nextErrors = buildValidationErrors(activeStep)
    setErrors(nextErrors)
    if (stepHasErrors(activeStep, nextErrors)) return
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0))
  }

  const handleStepSelect = (targetStep: number) => {
    if (targetStep <= activeStep) {
      setActiveStep(targetStep)
      return
    }

    const nextErrors = buildValidationErrors(targetStep - 1)
    setErrors(nextErrors)
    for (let stepIndex = activeStep; stepIndex < targetStep; stepIndex += 1) {
      if (stepHasErrors(stepIndex, nextErrors)) {
        setActiveStep(stepIndex)
        return
      }
    }

    setActiveStep(targetStep)
  }

  const handleAddPriceRow = () => {
    setPriceRows((prev) => [...prev, createPriceRow()])
  }

  const handleRemovePriceRow = (id: string) => {
    setPriceRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev))
    setErrors((prev) => {
      if (!prev.priceRows?.[id]) return prev
      const nextPriceRows = { ...prev.priceRows }
      delete nextPriceRows[id]
      return {
        ...prev,
        priceRows: Object.keys(nextPriceRows).length > 0 ? nextPriceRows : undefined,
      }
    })
  }

  const handleUpdatePriceRow = (id: string, next: Partial<PriceRow>) => {
    setPriceRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...next } : row))
    )
  }
  const handleMainCategoryChange = (value: string) => {
    setMainCategory(value)
    setSubCategory('')
    setSubSubCategory('')
    setErrors((prev) => ({
      ...prev,
      mainCategory: undefined,
      subCategory: undefined,
      subSubCategory: undefined,
    }))
  }
  const handleSubCategoryChange = (value: string) => {
    setSubCategory(value)
    setSubSubCategory('')
    setErrors((prev) => ({
      ...prev,
      subCategory: undefined,
      subSubCategory: undefined,
    }))
  }

  const handleSave = () => {
    const nextErrors = buildValidationErrors()
    setErrors(nextErrors)
    const firstInvalidStep = getFirstInvalidStep(nextErrors)
    if (firstInvalidStep !== null) {
      setActiveStep(firstInvalidStep)
      return
    }

    if (!user?.userId) {
      toast.error('User id is required to save item.')
      return
    }

    const itemTypeId = parseId(company)
    const subTwoCatId = parseId(subSubCategory)
    const subThreeCatId = parseId(flavor)
    const sequenceSubChannelId = parseId(subChannelId)
    const ln = Number(lnCode.trim())
    const volumeValue = Number(volume)
    const measurement = VOLUME_MEASUREMENT_MAP[volume]

    const parsedPriceRows = priceRows.map((row) => ({
      subChannelId: parseId(row.subChannelId),
      itemPrice: Number(row.price.trim()),
      startDate: row.dateRange?.from ? formatLocalDate(row.dateRange.from) : '',
      validTill: row.dateRange?.to
        ? formatLocalDate(row.dateRange.to)
        : '2200-01-01',
    }))

    const hasInvalidPriceRows = parsedPriceRows.some(
      (row) =>
        row.subChannelId === null ||
        Number.isNaN(row.itemPrice) ||
        !row.startDate ||
        !row.validTill
    )

    if (
      itemTypeId === null ||
      subTwoCatId === null ||
      subThreeCatId === null ||
      sequenceSubChannelId === null ||
      Number.isNaN(ln) ||
      Number.isNaN(volumeValue) ||
      !measurement ||
      hasInvalidPriceRows
    ) {
      toast.error('Invalid item data. Please check the form values.')
      if (hasInvalidPriceRows) setActiveStep(2)
      return
    }

    addItemMutation.mutate({
      userId: user.userId,
      itemTypeId,
      subTwoCatId,
      subThreeCatId,
      itemName: itemName.trim(),
      ln,
      unitOfMeasure: uom,
      innerCount: 0,
      size,
      volume: volumeValue,
      weight: 0,
      measurement,
      sapCode: sapCode.trim(),
      imagePath: ' ',
      isActive: true,
      itemSequenceDTOList: [
        {
          subChannelId: sequenceSubChannelId,
          itemId: 0,
          isActive: true,
        },
      ],
      itemPriceDTOList: parsedPriceRows.map((row) => ({
        itemId: 0,
        subChannelId: row.subChannelId as number,
        itemPrice: row.itemPrice,
        startDate: row.startDate,
        validTill: row.validTill,
        isActive: true,
      })),
    })
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
                    onClick={() => handleStepSelect(index)}
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
                  <Input
                    id='item-name'
                    placeholder='Name'
                    value={itemName}
                    onChange={(event) => {
                      setItemName(event.target.value)
                      clearFieldError('itemName')
                    }}
                    className={cn(errors.itemName && 'border-destructive')}
                  />
                  {errors.itemName ? (
                    <p className='text-destructive text-sm'>{errors.itemName}</p>
                  ) : null}
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='sap-code'>SAP Code</Label>
                  <Input
                    id='sap-code'
                    placeholder='SAP Code'
                    value={sapCode}
                    onChange={(event) => {
                      setSapCode(event.target.value)
                      clearFieldError('sapCode')
                    }}
                    className={cn(errors.sapCode && 'border-destructive')}
                  />
                  {errors.sapCode ? (
                    <p className='text-destructive text-sm'>{errors.sapCode}</p>
                  ) : null}
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='ln-code'>LN Code</Label>
                  <Input
                    id='ln-code'
                    placeholder='LN Code'
                    value={lnCode}
                    onChange={(event) => {
                      setLnCode(event.target.value)
                      clearFieldError('lnCode')
                    }}
                    className={cn(errors.lnCode && 'border-destructive')}
                  />
                  {errors.lnCode ? (
                    <p className='text-destructive text-sm'>{errors.lnCode}</p>
                  ) : null}
                </div>
                <div className='space-y-2'>
                  <Label>Sub Channel</Label>
                  <Select
                    value={subChannelId}
                    onValueChange={(value) => {
                      setSubChannelId(value)
                      clearFieldError('subChannelId')
                    }}
                  >
                    <SelectTrigger
                      className={cn('w-full', errors.subChannelId && 'border-destructive')}
                    >
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
                  {errors.subChannelId ? (
                    <p className='text-destructive text-sm'>{errors.subChannelId}</p>
                  ) : null}
                </div>
                <div className='space-y-2'>
                  <Label>Company</Label>
                  <Select
                    value={company}
                    onValueChange={(value) => {
                      setCompany(value)
                      clearFieldError('company')
                    }}
                  >
                    <SelectTrigger
                      className={cn('w-full', errors.company && 'border-destructive')}
                    >
                      <SelectValue placeholder='Select...' />
                    </SelectTrigger>
                    <SelectContent>
                      {isItemBrandsLoading ? (
                        <SelectItem value='loading' disabled>
                          Loading...
                        </SelectItem>
                      ) : null}
                      {!isItemBrandsLoading && itemBrandsOptions.length === 0 ? (
                        <SelectItem value='empty' disabled>
                          No companies found
                        </SelectItem>
                      ) : null}
                      {!isItemBrandsLoading
                        ? itemBrandsOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))
                        : null}
                    </SelectContent>
                  </Select>
                  {errors.company ? (
                    <p className='text-destructive text-sm'>{errors.company}</p>
                  ) : null}
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
                  <Select value={mainCategory} onValueChange={handleMainCategoryChange}>
                    <SelectTrigger
                      className={cn('w-full', errors.mainCategory && 'border-destructive')}
                    >
                      <SelectValue placeholder='Select Main Category' />
                    </SelectTrigger>
                    <SelectContent>
                      {isMainCategoryLoading ? (
                        <SelectItem value='loading' disabled>
                          Loading...
                        </SelectItem>
                      ) : null}
                      {!isMainCategoryLoading && mainCategoryOptions.length === 0 ? (
                        <SelectItem value='empty' disabled>
                          No main categories found
                        </SelectItem>
                      ) : null}
                      {!isMainCategoryLoading
                        ? mainCategoryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))
                        : null}
                    </SelectContent>
                  </Select>
                  {errors.mainCategory ? (
                    <p className='text-destructive text-sm'>{errors.mainCategory}</p>
                  ) : null}
                </div>
                <div className='space-y-2'>
                  <Label>Sub Category</Label>
                  <Select
                    value={subCategory}
                    onValueChange={handleSubCategoryChange}
                    disabled={!mainCategory || isSubCategoryLoading}
                  >
                    <SelectTrigger
                      className={cn('w-full', errors.subCategory && 'border-destructive')}
                    >
                      <SelectValue
                        placeholder={
                          !mainCategory
                            ? 'Select Main Category first'
                            : 'Select Sub Category'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {!mainCategory ? (
                        <SelectItem value='no-main-category' disabled>
                          Select Main Category first
                        </SelectItem>
                      ) : null}
                      {mainCategory && isSubCategoryLoading ? (
                        <SelectItem value='loading' disabled>
                          Loading...
                        </SelectItem>
                      ) : null}
                      {mainCategory &&
                      !isSubCategoryLoading &&
                      subCategoryOptions.length === 0 ? (
                        <SelectItem value='empty' disabled>
                          No sub categories found
                        </SelectItem>
                      ) : null}
                      {mainCategory && !isSubCategoryLoading
                        ? subCategoryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))
                        : null}
                    </SelectContent>
                  </Select>
                  {errors.subCategory ? (
                    <p className='text-destructive text-sm'>{errors.subCategory}</p>
                  ) : null}
                </div>
                <div className='space-y-2'>
                  <Label>Sub Sub Category</Label>
                  <Select
                    value={subSubCategory}
                    onValueChange={(value) => {
                      setSubSubCategory(value)
                      clearFieldError('subSubCategory')
                    }}
                    disabled={!subCategory || isSubSubCategoryLoading}
                  >
                    <SelectTrigger
                      className={cn('w-full', errors.subSubCategory && 'border-destructive')}
                    >
                      <SelectValue
                        placeholder={
                          !subCategory
                            ? 'Select Sub Category first'
                            : 'Select Sub Sub Category'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {!subCategory ? (
                        <SelectItem value='no-sub-category' disabled>
                          Select Sub Category first
                        </SelectItem>
                      ) : null}
                      {subCategory && isSubSubCategoryLoading ? (
                        <SelectItem value='loading' disabled>
                          Loading...
                        </SelectItem>
                      ) : null}
                      {subCategory &&
                      !isSubSubCategoryLoading &&
                      subSubCategoryOptions.length === 0 ? (
                        <SelectItem value='empty' disabled>
                          No sub sub categories found
                        </SelectItem>
                      ) : null}
                      {subCategory && !isSubSubCategoryLoading
                        ? subSubCategoryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))
                        : null}
                    </SelectContent>
                  </Select>
                  {errors.subSubCategory ? (
                    <p className='text-destructive text-sm'>{errors.subSubCategory}</p>
                  ) : null}
                </div>
                <div className='space-y-2'>
                  <Label>Flavor</Label>
                  <Select
                    value={flavor}
                    onValueChange={(value) => {
                      setFlavor(value)
                      clearFieldError('flavor')
                    }}
                  >
                    <SelectTrigger
                      className={cn('w-full', errors.flavor && 'border-destructive')}
                    >
                      <SelectValue placeholder='Select Flavor' />
                    </SelectTrigger>
                    <SelectContent>
                      {isFlavourLoading ? (
                        <SelectItem value='loading' disabled>
                          Loading...
                        </SelectItem>
                      ) : null}
                      {!isFlavourLoading && flavourOptions.length === 0 ? (
                        <SelectItem value='empty' disabled>
                          No flavors found
                        </SelectItem>
                      ) : null}
                      {!isFlavourLoading
                        ? flavourOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))
                        : null}
                    </SelectContent>
                  </Select>
                  {errors.flavor ? (
                    <p className='text-destructive text-sm'>{errors.flavor}</p>
                  ) : null}
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
              {priceRows.map((row, index) => {
                const rowErrors = errors.priceRows?.[row.id]
                return (
                  <div key={row.id} className='space-y-4'>
                    <div className='grid gap-4 md:grid-cols-[1.1fr_0.7fr_1fr_auto] md:items-end'>
                      <div className='space-y-2'>
                        <Label>Sub Channel</Label>
                        <Select
                          value={row.subChannelId}
                          onValueChange={(value) => {
                            handleUpdatePriceRow(row.id, { subChannelId: value })
                            clearPriceRowError(row.id, 'subChannelId')
                          }}
                        >
                          <SelectTrigger
                            className={cn('w-full', rowErrors?.subChannelId && 'border-destructive')}
                          >
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
                        {rowErrors?.subChannelId ? (
                          <p className='text-destructive text-sm'>
                            {rowErrors.subChannelId}
                          </p>
                        ) : null}
                      </div>
                      <div className='space-y-2'>
                        <Label>Price</Label>
                        <Input
                          placeholder='Rs.'
                          value={row.price}
                          onChange={(event) => {
                            handleUpdatePriceRow(row.id, {
                              price: event.target.value,
                            })
                            clearPriceRowError(row.id, 'price')
                          }}
                          className={cn(rowErrors?.price && 'border-destructive')}
                        />
                        {rowErrors?.price ? (
                          <p className='text-destructive text-sm'>{rowErrors.price}</p>
                        ) : null}
                      </div>
                      <div className='space-y-2'>
                        <Label>Price Effective Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant='outline'
                              className={cn(
                                'w-full justify-between font-normal',
                                rowErrors?.dateRange && 'border-destructive'
                              )}
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
                              onSelect={(range) => {
                                handleUpdatePriceRow(row.id, { dateRange: range })
                                clearPriceRowError(row.id, 'dateRange')
                              }}
                              numberOfMonths={2}
                            />
                          </PopoverContent>
                        </Popover>
                        {rowErrors?.dateRange ? (
                          <p className='text-destructive text-sm'>{rowErrors.dateRange}</p>
                        ) : null}
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
                )
              })}
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
                  <Select
                    value={uom}
                    onValueChange={(value) => {
                      setUom(value)
                      clearFieldError('uom')
                    }}
                  >
                    <SelectTrigger className={cn('w-full', errors.uom && 'border-destructive')}>
                      <SelectValue placeholder='Select...' />
                    </SelectTrigger>
                    <SelectContent>
                      {isUomLoading ? (
                        <SelectItem value='loading' disabled>
                          Loading...
                        </SelectItem>
                      ) : null}
                      {!isUomLoading && uomOptions.length === 0 ? (
                        <SelectItem value='empty' disabled>
                          No UOM found
                        </SelectItem>
                      ) : null}
                      {!isUomLoading
                        ? uomOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))
                        : null}
                    </SelectContent>
                  </Select>
                  {errors.uom ? (
                    <p className='text-destructive text-sm'>{errors.uom}</p>
                  ) : null}
                </div>
                <div className='space-y-2'>
                  <Label>Size</Label>
                  <Select
                    value={size}
                    onValueChange={(value) => {
                      setSize(value)
                      clearFieldError('size')
                    }}
                  >
                    <SelectTrigger className={cn('w-full', errors.size && 'border-destructive')}>
                      <SelectValue placeholder='Select...' />
                    </SelectTrigger>
                    <SelectContent>
                      {BASE_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.size ? (
                    <p className='text-destructive text-sm'>{errors.size}</p>
                  ) : null}
                </div>
                <div className='space-y-2'>
                  <Label>Volume</Label>
                  <Select
                    value={volume}
                    onValueChange={(value) => {
                      setVolume(value)
                      clearFieldError('volume')
                    }}
                  >
                    <SelectTrigger
                      className={cn('w-full', errors.volume && 'border-destructive')}
                    >
                      <SelectValue placeholder='Select...' />
                    </SelectTrigger>
                    <SelectContent>
                      {BASE_VOLUME_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.volume ? (
                    <p className='text-destructive text-sm'>{errors.volume}</p>
                  ) : null}
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
              <Button
                type='button'
                onClick={handleSave}
                disabled={addItemMutation.isPending}
              >
                {addItemMutation.isPending ? 'Saving...' : 'Save Item'}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export default AddItem
