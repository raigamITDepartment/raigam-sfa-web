import React from 'react'

const WRITE_ACTION_WORDS = [
  'add',
  'create',
  'new',
  'save',
  'update',
  'edit',
  'delete',
  'remove',
  'activate',
  'deactivate',
  'disable',
  'enable',
  'approve',
  'reject',
  'submit',
  'post',
  'assign',
  'unassign',
  'publish',
  'unpublish',
  'void',
]

const WRITE_ACTION_PHRASES = [
  'change status',
  'status change',
  'set status',
  'cancel invoice',
]

const WRITE_WORD_REGEX = new RegExp(
  `\\b(${WRITE_ACTION_WORDS.join('|')})\\b`,
  'i'
)

const WRITE_PHRASE_REGEXES = WRITE_ACTION_PHRASES.map(
  (phrase) => new RegExp(phrase, 'i')
)

const ALLOW_ACTION_WORDS = ['logout', 'log out', 'sign out', 'signout']
const ALLOW_WORD_REGEX = new RegExp(
  `\\b(${ALLOW_ACTION_WORDS.join('|')})\\b`,
  'i'
)

export type ReadOnlyAllowProps = {
  'data-readonly-allow'?: boolean | string
  'data-allow-readonly'?: boolean | string
}

export function getReadOnlyAllowFlag(props: ReadOnlyAllowProps): boolean {
  const value = props['data-readonly-allow'] ?? props['data-allow-readonly']
  return value === '' || value === true || value === 'true'
}

export function extractText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join(' ')
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractText(node.props.children)
  }
  return ''
}

export function isWriteActionLabel(label: string): boolean {
  const normalized = label.trim()
  if (!normalized) return false
  if (ALLOW_WORD_REGEX.test(normalized)) return false
  if (WRITE_WORD_REGEX.test(normalized)) return true
  return WRITE_PHRASE_REGEXES.some((regex) => regex.test(normalized))
}

export function isReadOnlyExemptLabel(label: string): boolean {
  const normalized = label.trim()
  if (!normalized) return false
  return ALLOW_WORD_REGEX.test(normalized)
}
