const AUTH_USER_KEY = 'auth_user'

const READ_ONLY_USER_TYPE_IDS = new Set<number>([2, 3])

export function getStoredUserTypeId(): number | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { userTypeId?: unknown }
    const id = parsed?.userTypeId
    if (typeof id === 'number') return id
    if (typeof id === 'string') {
      const n = Number(id)
      if (!Number.isNaN(n)) return n
    }
  } catch {
    // ignore
  }
  return undefined
}

export function isReadOnlyUserTypeId(userTypeId?: number): boolean {
  if (userTypeId == null) return false
  return READ_ONLY_USER_TYPE_IDS.has(userTypeId)
}

export function isReadOnlyUserType(): boolean {
  return isReadOnlyUserTypeId(getStoredUserTypeId())
}
