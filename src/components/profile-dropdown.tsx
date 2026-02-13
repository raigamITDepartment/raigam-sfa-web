import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutDialog } from '@/components/sign-out-dialog'
import type { AuthUser } from '@/store/authSlice'

type AuthSummary = Partial<Pick<AuthUser, 'personalName' | 'userName' | 'userId'>> &
  {
    userGroupName?: string | null
    roleName?: string | null
  }

const STORAGE_KEY = 'auth_user'

export function ProfileDropdown() {
  const [open, setOpen] = useDialogState()
  const user = useAppSelector((s) => s.auth.user)
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

  const effectiveUser = storedUser ?? user
  const displayName =
    effectiveUser?.personalName || effectiveUser?.userName || 'Guest'
  const userGroupName = storedUser?.userGroupName ?? undefined
  const roleName = storedUser?.roleName ?? user?.role
  const initials = (displayName || 'U')
    .split(' ')
    .map((p) => (p[0] ?? '').toUpperCase())
    .join('')
    .slice(0, 2)

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
            <Avatar className='h-8 w-8'>
              <AvatarImage src='/avatars/01.png' alt={displayName} />
              <AvatarFallback className='bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100'>
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className='w-80 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-0 shadow-2xl dark:border-slate-800/80 dark:bg-slate-950'
          align='end'
          forceMount
        >
          <DropdownMenuLabel className='p-0 font-normal'>
            <div className='relative overflow-hidden px-4 pb-4 pt-4 text-white'>
              <div className='absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700' />
              <div className='absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(59,130,246,0.35)_0%,rgba(15,23,42,0.9)_65%)] opacity-80' />
              <div className='relative flex items-center gap-3'>
                <Avatar className='h-11 w-11 border border-white/20 shadow-lg'>
                  <AvatarImage src='/avatars/01.png' alt={displayName} />
                  <AvatarFallback className='bg-white/10 text-sm font-semibold text-white'>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-base font-semibold'>
                    {displayName}
                  </p>
                  <div className='mt-1 flex flex-wrap gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70'>
                    {userGroupName ? (
                      <span className='rounded-full bg-white/10 px-2 py-0.5'>
                        {userGroupName}
                      </span>
                    ) : null}
                    {roleName ? (
                      <span className='rounded-full bg-white/10 px-2 py-0.5'>
                        {roleName}
                      </span>
                    ) : null}
                    {!userGroupName && !roleName ? (
                      <span className='rounded-full bg-white/10 px-2 py-0.5'>
                        Signed in
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className='px-4 py-4'>
            <DropdownMenuItem
              variant='destructive'
              onClick={() => setOpen(true)}
              className='flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-red-200/80 bg-red-50 px-3 py-0 text-center text-sm font-semibold leading-none text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-100 focus:bg-red-100 focus:text-red-700 dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30'
            >
              Sign out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
