import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { ItemFormValues } from '@/types/itemForm'

type ReturnBaseProps = {
  controlClass: string
  priceOptions: { id: number; label: string; price: number }[]
  isLoadingPrices: boolean
  value: ItemFormValues
  onChange: (next: ItemFormValues) => void
  formatNegative: (n?: number | null) => string
}

type GoodReturnSectionProps = ReturnBaseProps & {
  useGoodReturn: boolean
  onToggle: (checked: boolean) => void
  errors: Record<string, string>
}

type MarketReturnSectionProps = ReturnBaseProps & {
  useMarketReturn: boolean
  onToggle: (checked: boolean) => void
  errors: Record<string, string>
}

export const GoodReturnSection = ({
  controlClass,
  priceOptions,
  isLoadingPrices,
  value,
  onChange,
  formatNegative,
  useGoodReturn,
  onToggle,
  errors,
}: GoodReturnSectionProps) => (
  <>
    <div className='mt-4 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100'>
      <input
        type='checkbox'
        className='h-4 w-4 accent-blue-600 dark:accent-blue-500'
        checked={useGoodReturn}
        onChange={(e) => onToggle(e.target.checked)}
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
              value={value.goodReturnAdjustedUnitPrice ?? 0}
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
              value={value.goodReturnTotalQty ?? 0}
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
              value={value.goodReturnFreeQty ?? 0}
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
            />
          </label>
        </div>
      </div>
    ) : null}
  </>
)

export const MarketReturnSection = ({
  controlClass,
  priceOptions,
  isLoadingPrices,
  value,
  onChange,
  formatNegative,
  useMarketReturn,
  onToggle,
  errors,
}: MarketReturnSectionProps) => (
  <>
    <div className='mt-0 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100'>
      <input
        type='checkbox'
        className='h-4 w-4 accent-blue-600 dark:accent-blue-500'
        checked={useMarketReturn}
        onChange={(e) => onToggle(e.target.checked)}
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
              value={value.marketReturnAdjustedUnitPrice ?? 0}
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
              value={value.marketReturnTotalQty ?? 0}
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
              value={value.marketReturnFreeQty ?? 0}
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
            />
          </label>
        </div>
      </div>
    ) : null}
  </>
)

export default GoodReturnSection
