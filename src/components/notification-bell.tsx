import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function NotificationBell() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative h-9 w-9 rounded-full'
        >
          <Bell className='h-5 w-5' />
          <span className='sr-only'>View notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-72'>
        <DropdownMenuLabel className='text-sm font-semibold'>
          Notifications
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className='py-6 text-center text-sm text-muted-foreground'>
          You're all caught up!
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationBell
