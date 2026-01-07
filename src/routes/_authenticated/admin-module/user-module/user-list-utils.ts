import type { UserDemarcationUser } from '@/types/users'

export const formatText = (value: unknown) => {
  if (value === null || value === undefined) return '-'
  const text = String(value).trim()
  return text ? text : '-'
}

export const formatUserFullName = (user: UserDemarcationUser) =>
  `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()

export const getInitials = (user: UserDemarcationUser) => {
  const parts = [user.firstName, user.lastName]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
  const base = parts.length ? parts.join(' ') : (user.userName ?? '')
  const initials = base
    .split(/\s+/)
    .map((chunk) => chunk[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return initials || 'U'
}
