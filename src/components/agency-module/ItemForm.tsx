import { useEffect, useState } from 'react'
import {
  getItemMainCategories,
  getItemsGroupedByMainCategory,
  findItemPriceByItemId,
} from '@/services/sales/itemPriceApi'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type ItemFormValues = {
  mainCatId: number | null
  itemId: number | null
  itemName: string
  sellUnitPrice: number | null
  sellPriceId?: number | null
  adjustedUnitPrice: number | null
  totalBookQty: number | null
  totalCancelQty: number | null
  totalBookValue: number | null
  totalFreeQty: number | null
  bookDiscountPercentage: number | null
  totalBookDiscountValue: number | null
  totalBookSellValue: number | null
  goodReturnUnitPrice: number | null
  goodReturnPriceId?: number | null
  goodReturnAdjustedUnitPrice: number | null
  goodReturnTotalQty: number | null
  goodReturnFreeQty: number | null
  goodReturnTotalVal: number | null
  marketReturnUnitPrice: number | null
  marketReturnPriceId?: number | null
  marketReturnAdjustedUnitPrice: number | null
  marketReturnTotalQty: number | null
  marketReturnFreeQty: number | null
  marketReturnTotalVal: number | null
  finalTotalValue: number | null
}

export type ItemFormProps = {
  value: ItemFormValues
  onChange: (next: ItemFormValues) => void
  onSubmit?: (next: ItemFormValues) => void
  onCancel?: () => void
  submitLabel?: string
  isSubmitting?: boolean
}

export const ItemForm = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  isSubmitting,
}: ItemFormProps) => {
  const emptyFormValues: ItemFormValues = {
    mainCatId: null,
    itemId: null,
    itemName: '',
    sellUnitPrice: null,
    sellPriceId: null,
    adjustedUnitPrice: null,
    totalBookQty: null,
    totalCancelQty: null,
    totalBookValue: null,
    totalFreeQty: null,
    bookDiscountPercentage: null,
    totalBookDiscountValue: null,
    totalBookSellValue: null,
    goodReturnUnitPrice: null,
    goodReturnPriceId: null,
    goodReturnAdjustedUnitPrice: null,
    goodReturnTotalQty: null,
    goodReturnFreeQty: null,
    goodReturnTotalVal: null,
    marketReturnUnitPrice: null,
    marketReturnPriceId: null,
    marketReturnAdjustedUnitPrice: null,
    marketReturnTotalQty: null,
    marketReturnFreeQty: null,
    marketReturnTotalVal: null,
    finalTotalValue: null,
  }

  const [mainCategories, setMainCategories] = useState<
    { id: number; label: string }[]
  >([])
  const [items, setItems] = useState<{ id: number; label: string }[]>([])
  const [isLoadingCats, setIsLoadingCats] = useState(false)
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [priceOptions, setPriceOptions] = useState<{ id: number; label: string; price: number }[]>([])
  const [isLoadingPrices, setIsLoadingPrices] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [useGoodReturn, setUseGoodReturn] = useState(false)
  const [useMarketReturn, setUseMarketReturn] = useState(false)
  const controlClass = 'h-10 min-h-[40px] bg-white dark:bg-slate-900'
  const epsilon = 0.0001
  const formatMoney = (n?: number | null) =>
    typeof n === 'number' && Number.isFinite(n) ? n.toFixed(2) : '-'
  const formatNegative = (n?: number | null) =>
    typeof n === 'number' && Number.isFinite(n) ? `-${Math.abs(n).toFixed(2)}` : ''

  const toggleGoodReturn = (checked: boolean) => {
    setUseGoodReturn(checked)
    if (!checked) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.goodReturnUnitPrice
        delete next.goodReturnTotalQty
        return next
      })
      onChange({
        ...value,
        goodReturnUnitPrice: null,
        goodReturnAdjustedUnitPrice: null,
        goodReturnTotalQty: null,
        goodReturnFreeQty: null,
        goodReturnTotalVal: null,
        goodReturnPriceId: null,
      })
    }
  }

  const toggleMarketReturn = (checked: boolean) => {
    setUseMarketReturn(checked)
    if (!checked) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.marketReturnUnitPrice
        delete next.marketReturnTotalQty
        return next
      })
      onChange({
        ...value,
        marketReturnUnitPrice: null,
        marketReturnAdjustedUnitPrice: null,
        marketReturnTotalQty: null,
        marketReturnFreeQty: null,
        marketReturnTotalVal: null,
        marketReturnPriceId: null,
      })
    }
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!value.mainCatId) nextErrors.mainCatId = 'Main Category is required'
    if (!value.itemId) nextErrors.itemId = 'Item Name is required'
    if (!value.sellUnitPrice) nextErrors.sellUnitPrice = 'Select Item Price is required'
    if (!value.totalBookQty) nextErrors.totalBookQty = 'Quantity is required'

    if (useGoodReturn) {
      if (!value.goodReturnUnitPrice) nextErrors.goodReturnUnitPrice = 'Good Return Unit Price is required'
      if (!value.goodReturnTotalQty) nextErrors.goodReturnTotalQty = 'Good Return Qty is required'
    }

    if (useMarketReturn) {
      if (!value.marketReturnUnitPrice) nextErrors.marketReturnUnitPrice = 'Market Return Unit Price is required'
      if (!value.marketReturnTotalQty) nextErrors.marketReturnTotalQty = 'Market Return Qty is required'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  useEffect(() => {
    const netQty = Math.max(
      (value.totalBookQty ?? 0) - (value.totalCancelQty ?? 0),
      0
    )
    const unit = value.adjustedUnitPrice ?? value.sellUnitPrice ?? 0
    const bookingTotal = Number.isFinite(unit) ? netQty * unit : null
    const discountPct = value.bookDiscountPercentage ?? 0
    const discountValue =
      bookingTotal !== null && Number.isFinite(discountPct)
        ? (bookingTotal * discountPct) / 100
        : null
    const totalBookSellValue =
      bookingTotal !== null
        ? bookingTotal - (discountValue ?? 0)
        : null

    const next: Partial<ItemFormValues> = {}

    if (bookingTotal !== null) {
      const rounded = Number(bookingTotal.toFixed(2))
      if (
        !Number.isFinite(value.totalBookValue ?? NaN) ||
        Math.abs((value.totalBookValue ?? 0) - rounded) > epsilon
      ) {
        next.totalBookValue = rounded
      }
    } else if (value.totalBookValue !== null) {
      next.totalBookValue = null
    }

    if (discountValue !== null) {
      const rounded = Number(discountValue.toFixed(2))
      if (
        !Number.isFinite(value.totalBookDiscountValue ?? NaN) ||
        Math.abs((value.totalBookDiscountValue ?? 0) - rounded) > epsilon
      ) {
        next.totalBookDiscountValue = rounded
      }
    } else if (value.totalBookDiscountValue !== null) {
      next.totalBookDiscountValue = null
    }

    if (totalBookSellValue !== null) {
      const rounded = Number(totalBookSellValue.toFixed(2))
      if (
        !Number.isFinite(value.totalBookSellValue ?? NaN) ||
        Math.abs((value.totalBookSellValue ?? 0) - rounded) > epsilon
      ) {
        next.totalBookSellValue = rounded
      }
    } else if (value.totalBookSellValue !== null) {
      next.totalBookSellValue = null
    }

    if (Object.keys(next).length) {
      onChange({ ...value, ...next })
    }
  }, [
    value.bookDiscountPercentage,
    value.totalBookQty,
    value.totalCancelQty,
    value.adjustedUnitPrice,
    value.sellUnitPrice,
    value.totalBookValue,
    value.totalBookDiscountValue,
    value.totalBookSellValue,
    onChange,
    value,
  ])

  useEffect(() => {
    if (!useGoodReturn) return
    const qty = value.goodReturnTotalQty ?? 0
    const freeQty = value.goodReturnFreeQty ?? 0
    const adjustedUnit = value.goodReturnAdjustedUnitPrice ?? 0
    const payingQty = Math.max(qty - freeQty, 0)
    const computed = Number.isFinite(adjustedUnit)
      ? payingQty * adjustedUnit
      : null
    const current = value.goodReturnTotalVal ?? null
    if (computed === null) {
      if (current !== null) {
        onChange({ ...value, goodReturnTotalVal: null })
      }
      return
    }
    const next = Number(computed.toFixed(2))
    if (!Number.isFinite(current) || Math.abs((current as number) - next) > 0.0001) {
      onChange({ ...value, goodReturnTotalVal: next })
    }
  }, [
    value.goodReturnTotalQty,
    value.goodReturnFreeQty,
    value.goodReturnAdjustedUnitPrice,
    value.goodReturnTotalVal,
    onChange,
    value,
    useGoodReturn,
  ])

  useEffect(() => {
    if (!useMarketReturn) return
    const qty = value.marketReturnTotalQty ?? 0
    const freeQty = value.marketReturnFreeQty ?? 0
    const adjustedUnit = value.marketReturnAdjustedUnitPrice ?? 0
    const payingQty = Math.max(qty - freeQty, 0)
    const computed = Number.isFinite(adjustedUnit)
      ? payingQty * adjustedUnit
      : null
    const current = value.marketReturnTotalVal ?? null
    if (computed === null) {
      if (current !== null) {
        onChange({ ...value, marketReturnTotalVal: null })
      }
      return
    }
    const next = Number(computed.toFixed(2))
    if (!Number.isFinite(current) || Math.abs((current as number) - next) > epsilon) {
      onChange({ ...value, marketReturnTotalVal: next })
    }
  }, [
    value.marketReturnTotalQty,
    value.marketReturnFreeQty,
    value.marketReturnAdjustedUnitPrice,
    value.marketReturnTotalVal,
    onChange,
    value,
    useMarketReturn,
  ])

  useEffect(() => {
    const afterDiscount = value.totalBookSellValue ?? 0
    const goodReturnTotalVal = value.goodReturnTotalVal ?? 0
    const marketReturnTotalVal = value.marketReturnTotalVal ?? 0
    const computedFinal =
      (afterDiscount - goodReturnTotalVal) +
      (afterDiscount - marketReturnTotalVal)
    const next = Number(computedFinal.toFixed(2))
    const current = value.finalTotalValue ?? null
    if (!Number.isFinite(current) || Math.abs((current as number) - next) > epsilon) {
      onChange({ ...value, finalTotalValue: next })
    }
  }, [
    value.totalBookSellValue,
    value.goodReturnTotalVal,
    value.marketReturnTotalVal,
    value.finalTotalValue,
    onChange,
    value,
  ])

  useEffect(() => {
    const hasGood =
      value.goodReturnUnitPrice !== null ||
      value.goodReturnAdjustedUnitPrice !== null ||
      value.goodReturnTotalQty !== null ||
      value.goodReturnFreeQty !== null ||
      value.goodReturnTotalVal !== null
    if (hasGood) setUseGoodReturn(true)
    const hasMarket =
      value.marketReturnUnitPrice !== null ||
      value.marketReturnAdjustedUnitPrice !== null ||
      value.marketReturnTotalQty !== null ||
      value.marketReturnFreeQty !== null ||
      value.marketReturnTotalVal !== null
    if (hasMarket) setUseMarketReturn(true)
  }, [
    value.goodReturnUnitPrice,
    value.goodReturnAdjustedUnitPrice,
    value.goodReturnTotalQty,
    value.goodReturnFreeQty,
    value.goodReturnTotalVal,
    value.marketReturnUnitPrice,
    value.marketReturnAdjustedUnitPrice,
    value.marketReturnTotalQty,
    value.marketReturnFreeQty,
    value.marketReturnTotalVal,
  ])

  useEffect(() => {
    const loadCats = async () => {
      setIsLoadingCats(true)
      try {
        const res = await getItemMainCategories()
        const payload = Array.isArray(res?.payload) ? res.payload : []
        setMainCategories(
          payload.map((c) => ({ id: c.id, label: c.itemMainCat }))
        )
      } finally {
        setIsLoadingCats(false)
      }
    }
    loadCats()
  }, [])

  useEffect(() => {
    const catId = value.mainCatId
    if (!catId) {
      setItems([])
      return
    }
    const loadItems = async () => {
      setIsLoadingItems(true)
      try {
        const res = await getItemsGroupedByMainCategory(catId)
        const list = Array.isArray(res) ? res : []
        setItems(list.map((i) => ({ id: i.itemId, label: i.itemName })))
      } finally {
        setIsLoadingItems(false)
      }
    }
    loadItems()
  }, [value.mainCatId])

  useEffect(() => {
    const itemId = value.itemId
    if (!itemId) {
      setPriceOptions([])
      return
    }
    const loadPrices = async () => {
      setIsLoadingPrices(true)
      try {
        const res = await findItemPriceByItemId(itemId)
        const list = Array.isArray(res?.payload) ? res.payload : []
        setPriceOptions(
          list.map((p) => ({
            id: p.id,
            label: `${p.itemPrice.toFixed(2)}`,
            price: p.itemPrice,
          }))
        )
      } finally {
        setIsLoadingPrices(false)
      }
    }
    loadPrices()
  }, [value.itemId])

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
          <span className='block font-medium'>Main Category</span>
          <Select
            value={value.mainCatId !== null ? String(value.mainCatId) : ''}
            onValueChange={(val) =>
              onChange({
                ...value,
                mainCatId: val === '' ? null : Number(val),
                itemId: null,
                itemName: '',
              })
            }
          >
            <SelectTrigger className={`${controlClass} w-full`}>
              <SelectValue placeholder={isLoadingCats ? 'Loading...' : 'Select Category'} />
            </SelectTrigger>
            <SelectContent>
              {mainCategories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.mainCatId ? (
            <p className='text-xs text-red-600'>{errors.mainCatId}</p>
          ) : null}
        </label>

        <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
          <span className='block font-medium'>Item Name</span>
          <Select
            disabled={!value.mainCatId || isLoadingItems}
            value={value.itemId !== null ? String(value.itemId) : ''}
            onValueChange={(val) => {
              const nextId = val === '' ? null : Number(val)
              const found = items.find((i) => i.id === nextId)
              onChange({
                ...value,
                itemId: Number.isNaN(nextId) ? null : nextId,
                itemName: found?.label ?? '',
              })
            }}
          >
            <SelectTrigger className={`${controlClass} w-full`}>
              <SelectValue
                placeholder={isLoadingItems ? 'Loading items...' : 'Select Item'}
              />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.itemId ? (
            <p className='text-xs text-red-600'>{errors.itemId}</p>
          ) : null}
        </label>
      </div>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
          <span className='block font-medium'>Select Item Price</span>
          <Select
            disabled={!value.itemId || isLoadingPrices}
            value={
              priceOptions.find((opt) => opt.price === value.sellUnitPrice)
                ? String(priceOptions.find((opt) => opt.price === value.sellUnitPrice)?.id)
                : ''
            }
            onValueChange={(val) => {
              const found = priceOptions.find((p) => String(p.id) === val)
              onChange({
                ...value,
                sellUnitPrice: found?.price ?? null,
                sellPriceId: found?.id ?? null,
                adjustedUnitPrice: found?.price ?? null,
              })
            }}
          >
            <SelectTrigger className={`${controlClass} w-full`}>
              <SelectValue
                placeholder={
                  isLoadingPrices
                    ? 'Loading prices...'
                    : priceOptions.length
                      ? 'Select Item Price'
                      : 'No prices found'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {priceOptions.map((opt) => (
                <SelectItem key={opt.id} value={String(opt.id)}>
                  {opt.label}
                </SelectItem>
              ))}
              </SelectContent>
            </Select>
          {errors.sellUnitPrice ? (
            <p className='text-xs text-red-600'>{errors.sellUnitPrice}</p>
          ) : null}
        </label>

        <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
          <span className='block font-medium'>Adjusted Unit Price (Rs)</span>
          <Input
            type='number'
            min='0'
            step='0.01'
            className={controlClass}
            placeholder='Adjusted Unit Price (Rs)'
            value={value.adjustedUnitPrice ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                adjustedUnitPrice:
                  e.target.value.trim() === ''
                    ? null
                    : Number.isNaN(Number(e.target.value))
                      ? null
                      : Number(e.target.value),
              })
            }
          />
        </label>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
          <span className='block font-medium'>Quantity</span>
          <Input
            type='number'
            min='0'
            step='1'
            className={controlClass}
            placeholder='Quantity'
            value={value.totalBookQty ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                totalBookQty:
                  e.target.value.trim() === ''
                    ? null
                    : Number.isNaN(Number(e.target.value))
                      ? null
                      : Number(e.target.value),
              })
            }
          />
          {errors.totalBookQty ? (
            <p className='text-xs text-red-600'>{errors.totalBookQty}</p>
          ) : null}
        </label>
        <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
          <span className='block font-medium'>Cancel Quantity</span>
          <Input
            type='number'
            min='0'
            step='1'
            className={controlClass}
            placeholder='Cancel Quantity'
            value={value.totalCancelQty ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                totalCancelQty:
                  e.target.value.trim() === ''
                    ? null
                    : Number.isNaN(Number(e.target.value))
                      ? null
                      : Number(e.target.value),
              })
            }
          />
        </label>

        <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
          <span className='block font-medium'>Discount (%)</span>
          <Input
            type='number'
            min='0'
            step='0.01'
            className={controlClass}
            placeholder='Discount (%)'
            value={value.bookDiscountPercentage ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                bookDiscountPercentage:
                  e.target.value.trim() === ''
                    ? null
                    : Number.isNaN(Number(e.target.value))
                      ? null
                      : Number(e.target.value),
              })
            }
          />
        </label>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
          <span className='block font-medium'>Item Discount Value (Rs.)</span>
          <Input
            className={controlClass}
            placeholder='Item Discount Value (Rs.)'
            value={value.totalBookDiscountValue ?? ''}
            disabled
          />
        </label>
        <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
          <span className='block font-medium'>Free Issue</span>
          <Input
            type='number'
            min='0'
            step='1'
            className={controlClass}
            placeholder='Free Issue'
            value={value.totalFreeQty ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                totalFreeQty:
                  e.target.value.trim() === ''
                    ? null
                    : Number.isNaN(Number(e.target.value))
                      ? null
                      : Number(e.target.value),
              })
            }
          />
        </label>
      </div>

      <div className='grid grid-cols-1 gap-4'>
        <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
          <span className='block font-medium'>Total Book Sell Value (Rs.)</span>
          <Input
            className={`${controlClass} w-full`}
            placeholder='Total Book Sell Value (Rs.)'
            value={value.totalBookSellValue ?? ''}
            disabled
          />
        </label>
      </div>

      <div className='mt-4 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100'>
        <input
          type='checkbox'
          className='h-4 w-4 accent-blue-600 dark:accent-blue-500'
          checked={useGoodReturn}
          onChange={(e) => toggleGoodReturn(e.target.checked)}
        />
        Add Good Returns
      </div>

      {useGoodReturn ? (
        <div className='space-y-3 rounded-md bg-gray-100 p-4 dark:bg-slate-800/50'>
        <h4 className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
          Good Return Details
        </h4>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
            <span className='block font-medium'>Unit Price</span>
            <Select
              disabled={!useGoodReturn || !value.itemId || isLoadingPrices}
              value={
                priceOptions.find((opt) => opt.price === value.goodReturnUnitPrice)
                  ? String(
                      priceOptions.find(
                        (opt) => opt.price === value.goodReturnUnitPrice
                      )?.id
                    )
                  : ''
              }
              onValueChange={(val) => {
                const found = priceOptions.find((p) => String(p.id) === val)
                onChange({
                  ...value,
                  goodReturnUnitPrice: found?.price ?? null,
                  goodReturnPriceId: found?.id ?? null,
                  goodReturnAdjustedUnitPrice: found?.price ?? null,
                })
              }}
            >
              <SelectTrigger className={`${controlClass} w-full`}>
                <SelectValue
                  placeholder={
                    isLoadingPrices
                      ? 'Loading prices...'
                      : priceOptions.length
                        ? 'Select Unit Price'
                        : 'No prices found'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {priceOptions.map((opt) => (
                  <SelectItem key={opt.id} value={String(opt.id)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.goodReturnUnitPrice ? (
              <p className='text-xs text-red-600'>{errors.goodReturnUnitPrice}</p>
            ) : null}
          </label>
          <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
            <span className='block font-medium'>Adjusted Unit Price</span>
            <Input
              type='number'
              min='0'
              step='0.01'
              className={controlClass}
              placeholder='Adjusted Unit Price'
              value={value.goodReturnAdjustedUnitPrice ?? ''}
              disabled={!useGoodReturn}
              onChange={(e) =>
                onChange({
                  ...value,
                  goodReturnAdjustedUnitPrice:
                    e.target.value.trim() === ''
                      ? null
                      : Number.isNaN(Number(e.target.value))
                        ? null
                        : Number(e.target.value),
                })
              }
            />
          </label>
          <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
            <span className='block font-medium'>Quantity</span>
            <Input
              type='number'
              min='0'
              step='1'
              className={controlClass}
              placeholder='Quantity'
              value={value.goodReturnTotalQty ?? ''}
              disabled={!useGoodReturn}
              onChange={(e) =>
                onChange({
                  ...value,
                  goodReturnTotalQty:
                    e.target.value.trim() === ''
                      ? null
                      : Number.isNaN(Number(e.target.value))
                        ? null
                        : Number(e.target.value),
                })
              }
            />
            {errors.goodReturnTotalQty ? (
              <p className='text-xs text-red-600'>{errors.goodReturnTotalQty}</p>
            ) : null}
          </label>
          <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
            <span className='block font-medium'>Free Quantity</span>
            <Input
              type='number'
              min='0'
              step='1'
              className={controlClass}
              placeholder='Free Quantity'
              value={value.goodReturnFreeQty ?? ''}
              disabled={!useGoodReturn}
              onChange={(e) =>
                onChange({
                  ...value,
                  goodReturnFreeQty:
                    e.target.value.trim() === ''
                      ? null
                      : Number.isNaN(Number(e.target.value))
                        ? null
                        : Number(e.target.value),
                })
              }
            />
          </label>
          <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200 md:col-span-2'>
            <span className='block font-medium'>Good Return Total (Rs.)</span>
            <Input
              className={`${controlClass} w-full`}
              placeholder='Total'
              value={formatNegative(value.goodReturnTotalVal)}
              disabled
              onChange={(e) =>
                onChange({
                  ...value,
                  goodReturnTotalVal:
                    e.target.value.trim() === ''
                      ? null
                      : Number.isNaN(Number(e.target.value))
                        ? null
                        : Number(e.target.value),
                })
              }
            />
          </label>
        </div>
        </div>
      ) : null}

      <div className='mt-0 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100'>
        <input
          type='checkbox'
          className='h-4 w-4 accent-blue-600 dark:accent-blue-500'
          checked={useMarketReturn}
          onChange={(e) => toggleMarketReturn(e.target.checked)}
        />
        Add Market Returns
      </div>

      {useMarketReturn ? (
        <div className='space-y-3 rounded-md bg-gray-100 p-4 dark:bg-slate-800/50'>
        <h4 className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
          Market Return Details
        </h4>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
            <span className='block font-medium'>Unit Price</span>
            <Select
              disabled={!useMarketReturn || !value.itemId || isLoadingPrices}
              value={
                priceOptions.find((opt) => opt.price === value.marketReturnUnitPrice)
                  ? String(
                      priceOptions.find(
                        (opt) => opt.price === value.marketReturnUnitPrice
                      )?.id
                    )
                  : ''
              }
              onValueChange={(val) => {
                const found = priceOptions.find((p) => String(p.id) === val)
                onChange({
                  ...value,
                  marketReturnUnitPrice: found?.price ?? null,
                  marketReturnPriceId: found?.id ?? null,
                  marketReturnAdjustedUnitPrice: found?.price ?? null,
                })
              }}
            >
              <SelectTrigger className={`${controlClass} w-full`}>
                <SelectValue
                  placeholder={
                    isLoadingPrices
                      ? 'Loading prices...'
                      : priceOptions.length
                        ? 'Select Unit Price'
                        : 'No prices found'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {priceOptions.map((opt) => (
                  <SelectItem key={opt.id} value={String(opt.id)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.marketReturnUnitPrice ? (
              <p className='text-xs text-red-600'>{errors.marketReturnUnitPrice}</p>
            ) : null}
          </label>
          <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
            <span className='block font-medium'>Adjusted Unit Price</span>
            <Input
              type='number'
              min='0'
              step='0.01'
              className={controlClass}
              placeholder='Adjusted Unit Price'
              value={value.marketReturnAdjustedUnitPrice ?? ''}
              disabled={!useMarketReturn}
              onChange={(e) =>
                onChange({
                  ...value,
                  marketReturnAdjustedUnitPrice:
                    e.target.value.trim() === ''
                      ? null
                      : Number.isNaN(Number(e.target.value))
                        ? null
                        : Number(e.target.value),
                })
              }
            />
          </label>
          <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
            <span className='block font-medium'>Quantity</span>
            <Input
              type='number'
              min='0'
              step='1'
              className={controlClass}
              placeholder='Quantity'
              value={value.marketReturnTotalQty ?? ''}
              disabled={!useMarketReturn}
              onChange={(e) =>
                onChange({
                  ...value,
                  marketReturnTotalQty:
                    e.target.value.trim() === ''
                      ? null
                      : Number.isNaN(Number(e.target.value))
                        ? null
                        : Number(e.target.value),
                })
              }
            />
            {errors.marketReturnTotalQty ? (
              <p className='text-xs text-red-600'>{errors.marketReturnTotalQty}</p>
            ) : null}
          </label>
          <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
            <span className='block font-medium'>Free Quantity</span>
            <Input
              type='number'
              min='0'
              step='1'
              className={controlClass}
              placeholder='Free Quantity'
              value={value.marketReturnFreeQty ?? ''}
              disabled={!useMarketReturn}
              onChange={(e) =>
                onChange({
                  ...value,
                  marketReturnFreeQty:
                    e.target.value.trim() === ''
                      ? null
                      : Number.isNaN(Number(e.target.value))
                        ? null
                        : Number(e.target.value),
                })
              }
            />
          </label>
          <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200 md:col-span-2'>
            <span className='block font-medium'>Total (Rs.)</span>
            <Input
              className={`${controlClass} w-full`}
              placeholder='Total'
              value={formatNegative(value.marketReturnTotalVal)}
              disabled
              onChange={(e) =>
                onChange({
                  ...value,
                  marketReturnTotalVal:
                    e.target.value.trim() === ''
                      ? null
                      : Number.isNaN(Number(e.target.value))
                        ? null
                        : Number(e.target.value),
                })
              }
            />
          </label>
        </div>
        </div>
      ) : null}

      <div className='rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <span className='text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300'>
            Total (Rs.)
          </span>
          <span className='text-2xl font-bold text-blue-700 dark:text-blue-300'>
            Rs. {formatMoney(value.finalTotalValue)}
          </span>
        </div>
      </div>
      {onSubmit ? (
        <div className='flex justify-end gap-2'>
          {onCancel ? (
            <Button
              type='button'
              variant='outline'
              className='h-10 min-h-[40px]'
              onClick={() => {
                onChange({ ...emptyFormValues })
                setUseGoodReturn(false)
                setUseMarketReturn(false)
                setErrors({})
                onCancel()
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type='button'
            className='h-10 px-4'
            onClick={() => {
              if (!validate()) return
              console.log('[ItemForm] Save Item clicked', value)
              //alert(JSON.stringify(value, null, 2))
              onSubmit(value)
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : submitLabel ?? 'Save'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default ItemForm
