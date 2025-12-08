import { useEffect, useState } from 'react'
import {
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
import { GoodReturnSection, MarketReturnSection } from './ItemFormReturnSections'
import type { ItemFormValues } from '@/types/itemForm'
import type { ItemFormProps as BaseItemFormProps } from './AddItemForm'

export type UpdateItemFormProps = BaseItemFormProps

export const UpdateItemForm = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  isSubmitting,
}: UpdateItemFormProps) => {
  const emptyFormValues: ItemFormValues = {
    mainCatId: null,
    itemId: null,
    itemName: '',
    sellUnitPrice: null,
    sellPriceId: null,
    adjustedUnitPrice: 0,
    totalBookQty: 0,
    totalCancelQty: 0,
    totalBookValue: null,
    totalFreeQty: 0,
    bookDiscountPercentage: 0,
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

  const [items, setItems] = useState<{ id: number; label: string }[]>(
    value.itemId && value.itemName ? [{ id: value.itemId, label: value.itemName }] : []
  )
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
    if (!value.itemId) nextErrors.itemId = 'Item Name is required'
    if (!value.sellUnitPrice) nextErrors.sellUnitPrice = 'Select Item Price is required'
    if (value.totalBookQty === null || value.totalBookQty === undefined) nextErrors.totalBookQty = 'Quantity is required'

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
      afterDiscount - goodReturnTotalVal - marketReturnTotalVal
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
    const catId = value.mainCatId
    if (!catId) {
      if (value.itemId && value.itemName) {
        setItems([{ id: value.itemId, label: value.itemName }])
      } else {
        setItems([])
      }
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
  }, [value.mainCatId, value.itemId, value.itemName])

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
      <div className='grid grid-cols-1 gap-4'>
        <label className='space-y-1 text-sm text-slate-700 dark:text-slate-200'>
          <span className='block font-medium'>Item Name</span>
          <Input
            value={value.itemName ?? ''}
            disabled
            className={controlClass}
            placeholder='Item Name'
          />
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
              priceOptions.find((opt) => opt.id === value.sellPriceId)
                ? String(value.sellPriceId)
                : priceOptions.find((opt) => opt.price === value.sellUnitPrice)
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
            value={value.adjustedUnitPrice ?? 0}
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
            value={value.totalBookQty ?? 0}
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
            value={value.totalCancelQty ?? 0}
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
            value={value.bookDiscountPercentage ?? 0}
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
            value={value.totalBookDiscountValue ?? 0}
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
            value={value.totalFreeQty ?? 0}
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
            value={value.totalBookSellValue ?? 0}
            disabled
          />
        </label>
      </div>

      <GoodReturnSection
        controlClass={controlClass}
        priceOptions={priceOptions}
        isLoadingPrices={isLoadingPrices}
        value={value}
        onChange={onChange}
        formatNegative={formatNegative}
        useGoodReturn={useGoodReturn}
        onToggle={toggleGoodReturn}
        errors={errors}
      />

      <MarketReturnSection
        controlClass={controlClass}
        priceOptions={priceOptions}
        isLoadingPrices={isLoadingPrices}
        value={value}
        onChange={onChange}
        formatNegative={formatNegative}
        useMarketReturn={useMarketReturn}
        onToggle={toggleMarketReturn}
        errors={errors}
      />

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
              onSubmit(value)
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : submitLabel ?? 'Update Item'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default UpdateItemForm
