import { useEffect, useState } from 'react'
import type { AuthUser } from '@/store/authSlice'
import { MapPin, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

type HeaderInfo = Pick<AuthUser, 'territoryName' | 'distributorName'>

const STORAGE_KEY = 'auth_user'

const InfoPill = ({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof Store
  label: string
  value: string
  className?: string
}) => (
  <div
    className={cn(
      'flex items-center gap-3 rounded-md border border-indigo-100 bg-white/80 px-4 py-3 shadow-sm ring-1 ring-indigo-50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70 dark:ring-slate-800',
      'min-w-[12rem] flex-1 basis-1/2',
      className
    )}
  >
    <div className='flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 ring-4 ring-indigo-50 dark:bg-indigo-500/20 dark:text-indigo-200 dark:ring-slate-800'>
      <Icon className='h-5 w-5' />
    </div>
    <div className='leading-tight'>
      <p className='text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400'>
        {label}
      </p>
      <p className='truncate text-base font-semibold text-slate-900 dark:text-slate-50'>
        {value}
      </p>
    </div>
  </div>
)

const AgencyHeader = () => {
  const [info, setInfo] = useState<HeaderInfo | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as HeaderInfo
        setInfo(parsed)
      }
    } catch {
      setInfo(null)
    }
  }, [])

  const distributor = info?.distributorName || 'Distributor N/A'
  const territory = info?.territoryName || 'Territory N/A'

  return (
    <div className='mt-4 flex w-full min-w-0 flex-nowrap items-stretch gap-4 overflow-x-auto rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-blue-50 p-4 shadow-sm ring-1 ring-indigo-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 dark:ring-slate-800/70'>
      <InfoPill icon={Store} label='Distributor' value={distributor} />
      <InfoPill icon={MapPin} label='Territory' value={territory} />
    </div>
  )
}

export default AgencyHeader
