import { useEffect, useMemo, useState } from 'react'
import { Building2, Compass, MapPin, ShieldCheck, UserCircle } from 'lucide-react'
import type { AuthUser } from '@/store/authSlice'
import { useAppSelector } from '@/store/hooks'
import { cn } from '@/lib/utils'

type AuthSummary = Partial<
  Pick<
    AuthUser,
    | 'personalName'
    | 'userName'
    | 'role'
    | 'userType'
    | 'userId'
    | 'territoryName'
    | 'distributorName'
    | 'range'
  >
>

const STORAGE_KEY = 'auth_user'

type MetaItem = {
  label: string
  value?: string | number | null
  icon: typeof MapPin
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)
}

export function LoggedUserSummary({ className }: { className?: string }) {
  const reduxUser = useAppSelector((s) => s.auth.user)
  const [storedUser, setStoredUser] = useState<AuthSummary | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      setStoredUser(JSON.parse(raw) as AuthSummary)
    } catch {
      setStoredUser(null)
    }
  }, [])

  const user = storedUser ?? reduxUser
  const displayName = user?.personalName || user?.userName || 'User'
  const role = user?.role || user?.userType || 'Role'
  const initials = getInitials(displayName || 'U')

  const metaItems = useMemo<MetaItem[]>(
    () => [
      {
        label: 'Distributor',
        value: user?.distributorName,
        icon: Building2,
      },
      {
        label: 'Territory',
        value: user?.territoryName,
        icon: MapPin,
      },
      {
        label: 'Range',
        value: user?.range,
        icon: Compass,
      },
    ],
    [user?.distributorName, user?.territoryName, user?.range]
  )

  return (
    <>
      <div
        className={cn(
          'flex min-w-0 items-center gap-2 rounded-full border border-slate-200/70 bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-950/80',
          'lg:hidden',
          className
        )}
      >
        <div className='flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-slate-50 dark:bg-slate-100 dark:text-slate-900'>
          {initials}
        </div>
        <div className='min-w-0'>
          <p className='max-w-[9rem] truncate text-xs font-semibold text-slate-900 dark:text-slate-50'>
            {displayName}
          </p>
          <p className='text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400'>
            {role}
          </p>
        </div>
      </div>

      <div
        className={cn(
          'relative hidden min-w-0 items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/80 px-3 py-2 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.8)] backdrop-blur-sm transition-shadow duration-300',
          'before:absolute before:inset-0 before:rounded-2xl before:bg-[linear-gradient(110deg,rgba(15,23,42,0.06),rgba(59,130,246,0.08),rgba(248,250,252,0.4))] before:opacity-0 before:transition-opacity before:duration-300',
          'hover:shadow-[0_22px_46px_-30px_rgba(15,23,42,0.9)] hover:before:opacity-100',
          'dark:border-slate-800/70 dark:bg-slate-950/70 dark:shadow-[0_20px_40px_-32px_rgba(15,23,42,0.95)] dark:before:bg-[linear-gradient(110deg,rgba(30,41,59,0.4),rgba(14,116,144,0.25),rgba(15,23,42,0.15))]',
          'lg:flex',
          className
        )}
      >
        <div className='relative flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-slate-50 shadow-inner ring-2 ring-slate-200/80 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-800'>
          <UserCircle className='absolute h-8 w-8 opacity-10' />
          <span className='text-sm font-semibold tracking-wide'>{initials}</span>
        </div>
        <div className='relative min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <p className='max-w-[18rem] truncate text-sm font-semibold text-slate-900 dark:text-slate-50'>
              {displayName}
            </p>
            <span className='inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'>
              <ShieldCheck className='h-3 w-3' />
              {role}
            </span>
            {user?.userId != null ? (
              <span className='hidden items-center gap-1 rounded-full border border-slate-200/60 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-800/70 dark:bg-slate-900 dark:text-slate-400 xl:inline-flex'>
                ID #{user.userId}
              </span>
            ) : null}
          </div>
          <div className='mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400'>
            {metaItems
              .filter((item) => item.value)
              .map((item) => (
                <span
                  key={item.label}
                  className='inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/70 px-2 py-0.5 font-medium text-slate-600 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/70 dark:text-slate-300'
                >
                  <item.icon className='h-3 w-3' />
                  {item.label}:
                  <span className='ml-0.5 truncate text-slate-900 dark:text-slate-100'>
                    {item.value}
                  </span>
                </span>
              ))}
          </div>
        </div>
      </div>
    </>
  )
}
