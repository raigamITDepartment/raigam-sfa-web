import { useEffect, useMemo, useRef, useState } from 'react'
import {
  collection,
  doc,
  getDocs,
  query,
  writeBatch,
  updateDoc,
  where,
  type Query,
  type Timestamp,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getFirebaseAuth, getFirebaseDb } from '@/services/firebase'
import { useAppSelector } from '@/store/hooks'

type NotificationItem = {
  id: string
  title: string
  message: string
  status: string
  createdAt: Date | null
}

const MAX_ITEMS = 5

export function NotificationBell() {
  const subRoleId = useAppSelector((state) => state.auth.user?.subRoleId)
  const [uid, setUid] = useState<string | null>(null)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const fetchRef = useRef<() => void>(() => {})

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!uid && !subRoleId) {
      setItems([])
      setUnreadCount(0)
      return
    }

    const db = getFirebaseDb()
    const queries: Query[] = []
    if (uid) {
      queries.push(
        query(
          collection(db, 'notifications'),
          where('recipientUid', '==', uid)
        )
      )
    }
    if (subRoleId) {
      queries.push(
        query(
          collection(db, 'notifications'),
          where('recipientSubRoleId', '==', subRoleId)
        )
      )
    }
    let active = true

    const fetchNotifications = async () => {
      try {
        const snapshots = await Promise.all(
          queries.map((q) => getDocs(q))
        )
        if (!active) return
        const merged = new Map<string, NotificationItem>()
        snapshots.forEach((snapshot) => {
          snapshot.docs.forEach((doc) => {
            const data = doc.data() as {
              title?: string
              message?: string
              status?: string
              createdAt?: Timestamp | null
            }
            merged.set(doc.id, {
              id: doc.id,
              title: data.title ?? 'Notification',
              message: data.message ?? '',
              status: data.status ?? 'UNREAD',
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
            })
          })
        })
        const nextItems = Array.from(merged.values())
        const sorted = nextItems
          .slice()
          .sort((a, b) => {
            const aTime = a.createdAt ? a.createdAt.getTime() : 0
            const bTime = b.createdAt ? b.createdAt.getTime() : 0
            return bTime - aTime
          })
          .slice(0, MAX_ITEMS)

        setItems(sorted)
        setUnreadCount(
          nextItems.filter((item) => item.status === 'UNREAD').length
        )
      } catch {
        if (!active) return
        setItems([])
        setUnreadCount(0)
      }
    }

    fetchRef.current = fetchNotifications
    fetchNotifications()
    const interval = window.setInterval(fetchNotifications, 30_000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [uid, subRoleId])

  const headerLabel = useMemo(() => {
    if (!uid) return 'Notifications'
    return unreadCount > 0
      ? `Notifications (${unreadCount})`
      : 'Notifications'
  }, [unreadCount, uid])

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          fetchRef.current()
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative h-9 w-9 rounded-full'
        >
          <Bell className='h-5 w-5' />
          {unreadCount > 0 ? (
            <Badge className='absolute -end-1 -top-1 h-5 min-w-5 animate-pulse rounded-full bg-red-600 px-1 text-[10px] leading-5 text-white'>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          ) : null}
          <span className='sr-only'>View notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-80 p-0'>
        <DropdownMenuLabel className='flex items-center justify-between px-3 py-2 text-sm font-semibold'>
          <span>{headerLabel}</span>
          {unreadCount > 0 ? (
            <button
              type='button'
              className='text-xs font-medium text-blue-600 hover:underline'
              disabled={isMarkingAll}
              onClick={async () => {
                const db = getFirebaseDb()
                const unreadQueries = []
                if (uid) {
                  unreadQueries.push(
                    query(
                      collection(db, 'notifications'),
                      where('recipientUid', '==', uid),
                      where('status', '==', 'UNREAD')
                    )
                  )
                }
                if (subRoleId) {
                  unreadQueries.push(
                    query(
                      collection(db, 'notifications'),
                      where('recipientSubRoleId', '==', subRoleId),
                      where('status', '==', 'UNREAD')
                    )
                  )
                }
                if (!unreadQueries.length) return
                setIsMarkingAll(true)
                try {
                  const snapshots = await Promise.all(
                    unreadQueries.map((q) => getDocs(q))
                  )
                  const unreadIds = Array.from(
                    new Set(
                      snapshots.flatMap((snapshot) =>
                        snapshot.docs.map((doc) => doc.id)
                      )
                    )
                  )
                  if (!unreadIds.length) return
                  const chunkSize = 450
                  for (let i = 0; i < unreadIds.length; i += chunkSize) {
                    const batch = writeBatch(db)
                    unreadIds.slice(i, i + chunkSize).forEach((id) => {
                      batch.update(doc(db, 'notifications', id), {
                        status: 'READ',
                      })
                    })
                    await batch.commit()
                  }
                  setItems((prev) =>
                    prev.map((item) =>
                      unreadIds.includes(item.id)
                        ? { ...item, status: 'READ' }
                        : item
                    )
                  )
                  setUnreadCount(0)
                } finally {
                  setIsMarkingAll(false)
                }
              }}
            >
              Mark all as read
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className='py-6 text-center text-sm text-muted-foreground'>
            {uid
              ? "You're all caught up!"
              : 'Sign in to view notifications.'}
          </div>
        ) : (
          <div className='flex flex-col gap-3 px-3 py-2'>
            {items.map((item) => (
              <div key={item.id} className='space-y-1'>
                <div className='flex items-center gap-2 text-sm font-medium'>
                  <span>{item.title}</span>
                  {item.status === 'UNREAD' ? (
                    <span className='h-2 w-2 rounded-full bg-primary' />
                  ) : null}
                </div>
                {item.message ? (
                  <div className='text-xs text-muted-foreground'>
                    {item.message}
                  </div>
                ) : null}
                {item.createdAt ? (
                  <div className='text-[11px] text-muted-foreground'>
                    {item.createdAt.toLocaleString()}
                  </div>
                ) : null}
                {item.status === 'UNREAD' ? (
                  <button
                    type='button'
                    className='text-xs text-blue-600 hover:underline'
                    disabled={isUpdating === item.id}
                    onClick={async () => {
                      setIsUpdating(item.id)
                      try {
                        const db = getFirebaseDb()
                        await updateDoc(doc(db, 'notifications', item.id), {
                          status: 'READ',
                        })
                        setItems((prev) =>
                          prev.map((current) =>
                            current.id === item.id
                              ? { ...current, status: 'READ' }
                              : current
                          )
                        )
                        setUnreadCount((prev) => Math.max(prev - 1, 0))
                      } finally {
                        setIsUpdating(null)
                      }
                    }}
                  >
                    Mark as read
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationBell
