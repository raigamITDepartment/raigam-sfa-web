import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, ChevronRight, Laptop, Moon, Sun } from 'lucide-react'
import { useSearch } from '@/context/search-provider'
import { useTheme } from '@/context/theme-provider'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { sidebarData } from './layout/data/sidebar-data'
import { ScrollArea } from './ui/scroll-area'
import { isPathAllowedForUser, resolvePermissions } from '@/lib/authz'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

export function CommandMenu() {
  const navigate = useNavigate()
  const { setTheme } = useTheme()
  const { open, setOpen } = useSearch()
  const userGroupId = useSelector((s: RootState) => s.auth.user?.userGroupId)
  const roleId = useSelector((s: RootState) => s.auth.user?.roleId)
  const permissions = useSelector((s: RootState) => s.auth.user?.permissions)

  const effectivePermissions = React.useMemo(
    () =>
      resolvePermissions({
        permissions,
        roleId: userGroupId,
        subRoleId: roleId,
      }),
    [permissions, userGroupId, roleId]
  )

  const visibleGroups = React.useMemo(() => {
    return sidebarData.navGroups
      .map((group) => {
        const visibleItems = group.items
          .map((item) => {
            if (item.items) {
              const subItems = item.items.filter((sub) =>
                isPathAllowedForUser(sub.url, effectivePermissions)
              )
              return subItems.length ? { ...item, items: subItems } : null
            }
            return isPathAllowedForUser(item.url, effectivePermissions)
              ? item
              : null
          })
          .filter(Boolean) as typeof group.items
        return visibleItems.length ? { ...group, items: visibleItems } : null
      })
      .filter(Boolean) as typeof sidebarData.navGroups
  }, [effectivePermissions])

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      command()
    },
    [setOpen]
  )

  return (
    <CommandDialog modal open={open} onOpenChange={setOpen}>
      <CommandInput placeholder='Type a command or search...' />
      <CommandList>
        <ScrollArea type='hover' className='h-72 pe-1'>
          <CommandEmpty>No results found.</CommandEmpty>
          {visibleGroups.map((group) => (
            <CommandGroup key={group.title} heading={group.title}>
              {group.items.map((navItem, i) => {
                if (navItem.url)
                  return (
                    <CommandItem
                      key={`${navItem.url}-${i}`}
                      value={navItem.title}
                      onSelect={() => {
                        runCommand(() => navigate({ to: navItem.url }))
                      }}
                    >
                      <div className='flex size-4 items-center justify-center'>
                        <ArrowRight className='text-muted-foreground/80 size-2' />
                      </div>
                      {navItem.title}
                    </CommandItem>
                  )

                return navItem.items?.map((subItem, i) => (
                  <CommandItem
                    key={`${navItem.title}-${subItem.url}-${i}`}
                    value={`${navItem.title}-${subItem.url}`}
                    onSelect={() => {
                      runCommand(() => navigate({ to: subItem.url }))
                    }}
                  >
                    <div className='flex size-4 items-center justify-center'>
                      <ArrowRight className='text-muted-foreground/80 size-2' />
                    </div>
                    {navItem.title} <ChevronRight /> {subItem.title}
                  </CommandItem>
                ))
              })}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading='Theme'>
            <CommandItem onSelect={() => runCommand(() => setTheme('light'))}>
              <Sun /> <span>Light</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme('dark'))}>
              <Moon className='scale-90' />
              <span>Dark</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme('system'))}>
              <Laptop />
              <span>System</span>
            </CommandItem>
          </CommandGroup>
        </ScrollArea>
      </CommandList>
    </CommandDialog>
  )
}
