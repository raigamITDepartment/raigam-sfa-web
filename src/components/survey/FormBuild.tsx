import {
  type CSSProperties,
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Copy,
  Download,
  ExternalLink,
  FolderOpen,
  GripVertical,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type BuilderFieldType =
  | 'section-heading'
  | 'small-text'
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'

type BuilderFieldOption = {
  value: string
  label: string
}

type BuilderField = {
  id: string
  type: BuilderFieldType
  fieldNumber: string
  sectionPadding: string
  sectionMargin: string
  key: string
  label: string
  placeholder: string
  required: boolean
  disabled: boolean
  options: BuilderFieldOption[]
}

type DragPayload =
  | { kind: 'library'; fieldType: BuilderFieldType }
  | { kind: 'canvas'; fieldId: string }

type BuilderPersistedState = {
  formId: string
  viewRoutePath: string
  title: string
  heading: string
  subHeading: string
  description: string
  fields: BuilderField[]
}

type BuilderSchema = BuilderPersistedState & {
  schemaVersion: 1
  formId: string
  updatedAt: string
}

type FieldTemplate = {
  type: BuilderFieldType
  label: string
  hint: string
}

type SavedFormListItem = {
  fileName: string
  title: string
  fieldCount: number
  updatedAt: string
  size: number
  viewRoutePath: string
}

type BuilderApiPayload = {
  message?: string
  forms?: SavedFormListItem[]
  data?: unknown
}

const STORAGE_KEY = 'survey-form-builder-v1'

const FIELD_TEMPLATES: FieldTemplate[] = [
  {
    type: 'section-heading',
    label: 'Section Heading',
    hint: 'Visual section title',
  },
  {
    type: 'small-text',
    label: 'Small Text',
    hint: 'Display helper text',
  },
  { type: 'text', label: 'Text', hint: 'Single line text input' },
  { type: 'textarea', label: 'Textarea', hint: 'Long answer input' },
  { type: 'number', label: 'Number', hint: 'Numeric value' },
  { type: 'email', label: 'Email', hint: 'Email address input' },
  { type: 'date', label: 'Date', hint: 'Date picker' },
  { type: 'select', label: 'Select', hint: 'Dropdown options' },
  { type: 'radio', label: 'Radio', hint: 'Single choice list' },
  { type: 'checkbox', label: 'Checkbox', hint: 'Multi choice list' },
]

const CHOICE_FIELD_TYPES: BuilderFieldType[] = ['select', 'radio', 'checkbox']

function isChoiceField(fieldType: BuilderFieldType): boolean {
  return CHOICE_FIELD_TYPES.includes(fieldType)
}

function isDisplayOnlyFieldType(fieldType: BuilderFieldType): boolean {
  return fieldType === 'section-heading' || fieldType === 'small-text'
}

function supportsDisplaySpacing(fieldType: BuilderFieldType): boolean {
  return fieldType === 'section-heading' || fieldType === 'small-text'
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `field-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function toFieldKey(rawValue: string) {
  const cleaned = rawValue
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return cleaned.length > 0 ? cleaned : 'field'
}

function normalizeViewRoutePath(rawValue: string): string {
  const trimmed = rawValue.trim()
  if (!trimmed) return '/test-form'
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function ensureUniqueFieldKey(
  candidate: string,
  fields: BuilderField[],
  ignoreId?: string
) {
  const normalized = toFieldKey(candidate)
  if (!fields.some((field) => field.id !== ignoreId && field.key === normalized)) {
    return normalized
  }

  let index = 2
  let next = `${normalized}_${index}`

  while (fields.some((field) => field.id !== ignoreId && field.key === next)) {
    index += 1
    next = `${normalized}_${index}`
  }

  return next
}

function createDefaultOptions(): BuilderFieldOption[] {
  return [
    { value: 'option_1', label: 'Option 1' },
    { value: 'option_2', label: 'Option 2' },
  ]
}

function createFieldFromType(
  fieldType: BuilderFieldType,
  fields: BuilderField[]
): BuilderField {
  const template = FIELD_TEMPLATES.find((item) => item.type === fieldType)
  const baseLabel = template?.label ?? 'Field'
  const nextLabel =
    fields.filter((item) => item.type === fieldType).length > 0
      ? `${baseLabel} ${fields.filter((item) => item.type === fieldType).length + 1}`
      : baseLabel
  const key = ensureUniqueFieldKey(nextLabel, fields)

  return {
    id: createId(),
    type: fieldType,
    fieldNumber: '',
    sectionPadding: '',
    sectionMargin: '',
    key,
    label: nextLabel,
    placeholder:
      isDisplayOnlyFieldType(fieldType)
        ? ''
        : fieldType === 'select'
          ? 'Select One'
          : `Enter ${nextLabel.toLowerCase()}`,
    required: false,
    disabled: false,
    options: isChoiceField(fieldType) ? createDefaultOptions() : [],
  }
}

function sanitizeField(field: unknown, fields: BuilderField[]): BuilderField | null {
  if (!field || typeof field !== 'object') return null

  const raw = field as Partial<BuilderField>
  if (!raw.type || !FIELD_TEMPLATES.some((item) => item.type === raw.type)) {
    return null
  }

  const label =
    typeof raw.label === 'string' && raw.label.trim().length > 0
      ? raw.label.trim()
      : 'Field'
  const keySeed =
    typeof raw.key === 'string' && raw.key.trim().length > 0 ? raw.key : label

  const cleaned: BuilderField = {
    id: createId(),
    type: raw.type,
    fieldNumber:
      typeof raw.fieldNumber === 'string' ? raw.fieldNumber.trim() : '',
    sectionPadding:
      typeof raw.sectionPadding === 'string' ? raw.sectionPadding.trim() : '',
    sectionMargin:
      typeof raw.sectionMargin === 'string' ? raw.sectionMargin.trim() : '',
    key: ensureUniqueFieldKey(keySeed, fields),
    label,
    placeholder:
      typeof raw.placeholder === 'string'
        ? raw.placeholder
        : raw.type === 'select'
          ? 'Select One'
          : `Enter ${label.toLowerCase()}`,
    required: Boolean(raw.required),
    disabled: Boolean(raw.disabled),
    options: Array.isArray(raw.options)
      ? (raw.options as unknown[])
          .map((option): BuilderFieldOption | null => {
            if (typeof option === 'string') {
              const trimmed = option.trim()
              if (!trimmed) return null
              return { value: trimmed, label: trimmed }
            }
            if (!option || typeof option !== 'object') return null
            const rawOption = option as Partial<BuilderFieldOption>
            const value =
              typeof rawOption.value === 'string' ? rawOption.value.trim() : ''
            const label =
              typeof rawOption.label === 'string' ? rawOption.label.trim() : ''
            if (!value && !label) return null
            return {
              value: value || toFieldKey(label),
              label: label || value,
            }
          })
          .filter((option): option is BuilderFieldOption => Boolean(option))
      : [],
  }

  if (isChoiceField(cleaned.type) && cleaned.options.length === 0) {
    cleaned.options = createDefaultOptions()
  }

  if (cleaned.type === 'section-heading') {
    cleaned.required = false
    cleaned.disabled = false
    cleaned.placeholder = ''
    cleaned.options = []
  }

  if (cleaned.type === 'small-text') {
    cleaned.required = false
    cleaned.disabled = false
    cleaned.placeholder = ''
    cleaned.options = []
  }

  if (!isChoiceField(cleaned.type)) {
    cleaned.options = []
  }

  if (!supportsDisplaySpacing(cleaned.type)) {
    cleaned.sectionPadding = ''
    cleaned.sectionMargin = ''
  }

  return cleaned
}

function buildDisplayLabel(field: Pick<BuilderField, 'fieldNumber' | 'label'>): string {
  const trimmedNumber = field.fieldNumber.trim()
  if (!trimmedNumber) return field.label
  return `${trimmedNumber}. ${field.label}`
}

function buildFormViewUrl(viewRoutePath: string, fileName: string): string {
  const normalizedPath = normalizeViewRoutePath(viewRoutePath)
  const separator = normalizedPath.includes('?') ? '&' : '?'
  return `${normalizedPath}${separator}form=${encodeURIComponent(fileName)}`
}

function createNextOption(options: BuilderFieldOption[]): BuilderFieldOption {
  const nextIndex = options.length + 1
  return {
    value: `option_${nextIndex}`,
    label: `Option ${nextIndex}`,
  }
}

function parseBuilderState(rawValue: string): BuilderPersistedState | null {
  try {
    const parsed = JSON.parse(rawValue) as Partial<BuilderSchema>
    if (!parsed || typeof parsed !== 'object') return null

    const title =
      typeof parsed.title === 'string' && parsed.title.trim().length > 0
        ? parsed.title
        : 'Survey Form'
    const formId =
      typeof parsed.formId === 'string' && parsed.formId.trim().length > 0
        ? parsed.formId
        : toFieldKey(title)
    const viewRoutePath = normalizeViewRoutePath(
      typeof parsed.viewRoutePath === 'string' ? parsed.viewRoutePath : '/test-form'
    )
    const heading = typeof parsed.heading === 'string' ? parsed.heading : ''
    const subHeading = typeof parsed.subHeading === 'string' ? parsed.subHeading : ''
    const description =
      typeof parsed.description === 'string' ? parsed.description : ''
    const sourceFields = Array.isArray(parsed.fields) ? parsed.fields : []

    const fields: BuilderField[] = []
    sourceFields.forEach((field) => {
      const cleaned = sanitizeField(field, fields)
      if (cleaned) fields.push(cleaned)
    })

    return { formId, viewRoutePath, title, heading, subHeading, description, fields }
  } catch {
    return null
  }
}

function moveField(
  sourceFieldId: string,
  dropIndex: number,
  fields: BuilderField[]
): BuilderField[] {
  const sourceIndex = fields.findIndex((field) => field.id === sourceFieldId)
  if (sourceIndex < 0) return fields

  const next = [...fields]
  const [moved] = next.splice(sourceIndex, 1)
  const adjustedDropIndex = sourceIndex < dropIndex ? dropIndex - 1 : dropIndex
  const targetIndex = Math.max(0, Math.min(adjustedDropIndex, next.length))
  next.splice(targetIndex, 0, moved)
  return next
}

function getDisplayFieldStyle(
  field: Pick<BuilderField, 'sectionPadding' | 'sectionMargin'>
): CSSProperties | undefined {
  const padding = field.sectionPadding.trim()
  const margin = field.sectionMargin.trim()
  if (!padding && !margin) return undefined

  return {
    ...(padding ? { padding } : {}),
    ...(margin ? { margin } : {}),
  }
}

function renderPreviewField(field: BuilderField) {
  switch (field.type) {
    case 'section-heading':
      return (
        <h2 className='text-lg font-semibold' style={getDisplayFieldStyle(field)}>
          {buildDisplayLabel(field)}
        </h2>
      )

    case 'small-text':
      return (
        <p className='text-muted-foreground text-sm' style={getDisplayFieldStyle(field)}>
          {buildDisplayLabel(field)}
        </p>
      )

    case 'textarea':
      return (
        <Textarea
          disabled
          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
        />
      )

    case 'select':
      return (
        <select
          disabled
          className='border-input bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm'
          defaultValue=''
        >
          <option value=''>{field.placeholder || 'Select One'}</option>
          {field.options.map((option) => (
            <option key={`${field.id}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )

    case 'radio':
      return (
        <div className='space-y-2'>
          {field.options.map((option) => (
            <label
              key={`${field.id}-${option.value}`}
              className='flex items-center gap-2 text-sm'
            >
              <input type='radio' disabled name={field.id} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )

    case 'checkbox':
      return (
        <div className='space-y-2'>
          {field.options.map((option) => (
            <label
              key={`${field.id}-${option.value}`}
              className='flex items-center gap-2 text-sm'
            >
              <input type='checkbox' disabled />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )

    default:
      return (
        <Input
          disabled
          type={field.type}
          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
        />
      )
  }
}

function parseDragPayload(rawValue: string): DragPayload | null {
  if (!rawValue) return null
  try {
    const parsed = JSON.parse(rawValue) as Partial<DragPayload>
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.kind === 'library' && parsed.fieldType) {
      if (FIELD_TEMPLATES.some((template) => template.type === parsed.fieldType)) {
        return { kind: 'library', fieldType: parsed.fieldType }
      }
    }
    if (parsed.kind === 'canvas' && typeof parsed.fieldId === 'string') {
      return { kind: 'canvas', fieldId: parsed.fieldId }
    }
    return null
  } catch {
    return null
  }
}

function formatDateTime(rawValue: string): string {
  const parsed = new Date(rawValue)
  if (Number.isNaN(parsed.getTime())) return rawValue
  return parsed.toLocaleString()
}

async function readJsonPayload(response: Response): Promise<BuilderApiPayload | null> {
  const rawText = await response.text()
  if (!rawText.trim()) return null

  try {
    return JSON.parse(rawText) as BuilderApiPayload
  } catch {
    return null
  }
}

export function FormBuild() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [formId, setFormId] = useState('survey_form')
  const [viewRoutePath, setViewRoutePath] = useState('/test-form')
  const [title, setTitle] = useState('Survey Form')
  const [heading, setHeading] = useState('')
  const [subHeading, setSubHeading] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<BuilderField[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [savedForms, setSavedForms] = useState<SavedFormListItem[]>([])
  const [savedFormsLoading, setSavedFormsLoading] = useState(false)
  const [savedFormsError, setSavedFormsError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formToDelete, setFormToDelete] = useState<SavedFormListItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return

    const parsedState = parseBuilderState(saved)
    if (!parsedState) return

    setTitle(parsedState.title)
    setFormId(parsedState.formId)
    setViewRoutePath(parsedState.viewRoutePath)
    setHeading(parsedState.heading)
    setSubHeading(parsedState.subHeading)
    setDescription(parsedState.description)
    setFields(parsedState.fields)
    setSelectedFieldId(parsedState.fields[0]?.id ?? null)
  }, [])

  const loadSavedForms = async () => {
    setSavedFormsLoading(true)
    setSavedFormsError(null)
    try {
      const response = await fetch('/api/form-builder/list-json')
      const payload = await readJsonPayload(response)

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to load saved forms.')
      }

      if (!payload) {
        throw new Error(
          'Form builder API is not available here. Configure a backend API for production.'
        )
      }

      const forms = Array.isArray(payload.forms) ? payload.forms : []
      setSavedForms(
        forms.map((form) => ({
          ...form,
          viewRoutePath: normalizeViewRoutePath(form.viewRoutePath),
        }))
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load saved forms.'
      setSavedFormsError(message)
      setSavedForms([])
    } finally {
      setSavedFormsLoading(false)
    }
  }

  useEffect(() => {
    void loadSavedForms()
  }, [])

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) ?? null,
    [fields, selectedFieldId]
  )

  const schema = useMemo<BuilderSchema>(
    () => ({
      schemaVersion: 1,
      formId: toFieldKey(formId) || toFieldKey(title) || 'survey_form',
      viewRoutePath: normalizeViewRoutePath(viewRoutePath),
      title,
      heading,
      subHeading,
      description,
      fields,
      updatedAt: new Date().toISOString(),
    }),
    [formId, viewRoutePath, title, heading, subHeading, description, fields]
  )

  const schemaJson = useMemo(() => JSON.stringify(schema, null, 2), [schema])

  const addField = (fieldType: BuilderFieldType, insertAt = fields.length) => {
    let nextSelectedId: string | null = null
    setFields((currentFields) => {
      const nextField = createFieldFromType(fieldType, currentFields)
      const next = [...currentFields]
      const targetIndex = Math.max(0, Math.min(insertAt, next.length))
      next.splice(targetIndex, 0, nextField)
      nextSelectedId = nextField.id
      return next
    })

    if (nextSelectedId) {
      setSelectedFieldId(nextSelectedId)
    }
  }

  const removeField = (fieldId: string) => {
    setFields((currentFields) => currentFields.filter((field) => field.id !== fieldId))
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null)
    }
  }

  const updateField = (fieldId: string, updater: (field: BuilderField) => BuilderField) => {
    setFields((currentFields) =>
      currentFields.map((field) => (field.id === fieldId ? updater(field) : field))
    )
  }

  const handleLibraryDragStart = (
    event: DragEvent<HTMLDivElement>,
    fieldType: BuilderFieldType
  ) => {
    const payload: DragPayload = { kind: 'library', fieldType }
    setDragPayload(payload)
    event.dataTransfer.effectAllowed = 'copyMove'
    event.dataTransfer.setData('text/plain', JSON.stringify(payload))
  }

  const handleCanvasDragStart = (event: DragEvent<HTMLDivElement>, fieldId: string) => {
    const payload: DragPayload = { kind: 'canvas', fieldId }
    setDragPayload(payload)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify(payload))
  }

  const handleDropAt = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault()
    const payload =
      dragPayload ?? parseDragPayload(event.dataTransfer.getData('text/plain'))
    if (!payload) return

    if (payload.kind === 'library') {
      addField(payload.fieldType, index)
    } else {
      setFields((currentFields) => moveField(payload.fieldId, index, currentFields))
    }

    setDropIndex(null)
    setDragPayload(null)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault()
    setDropIndex(index)
  }

  const handleDragEnd = () => {
    setDragPayload(null)
    setDropIndex(null)
  }

  const handleSaveDraft = () => {
    const draft: BuilderPersistedState = {
      formId,
      viewRoutePath: normalizeViewRoutePath(viewRoutePath),
      title,
      heading,
      subHeading,
      description,
      fields,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    toast.success('Builder draft saved.')
  }

  const handleSaveToSrcData = async () => {
    try {
      const response = await fetch('/api/form-builder/save-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: `${toFieldKey(title) || 'survey-form'}.json`,
          data: schema,
        }),
      })

      const payload = await readJsonPayload(response)

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to save JSON file.')
      }

      if (!payload) {
        throw new Error(
          'Form builder API returned non-JSON response. Configure backend API in production.'
        )
      }

      toast.success(payload.message || 'Saved to src/data.')
      void loadSavedForms()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save JSON file.')
    }
  }

  const handleLoadSavedForm = async (fileName: string) => {
    try {
      const response = await fetch(
        `/api/form-builder/read-json?fileName=${encodeURIComponent(fileName)}`
      )
      const payload = await readJsonPayload(response)

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.message || 'Unable to load saved form.')
      }

      const parsed = parseBuilderState(JSON.stringify(payload.data))
      if (!parsed) {
        throw new Error('Invalid builder JSON format in selected file.')
      }

      setTitle(parsed.title)
      setFormId(parsed.formId)
      setViewRoutePath(parsed.viewRoutePath)
      setHeading(parsed.heading)
      setSubHeading(parsed.subHeading)
      setDescription(parsed.description)
      setFields(parsed.fields)
      setSelectedFieldId(parsed.fields[0]?.id ?? null)
      toast.success(`Loaded ${fileName}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load saved form.')
    }
  }

  const handleOpenDeleteDialog = (form: SavedFormListItem) => {
    setFormToDelete(form)
    setDeleteDialogOpen(true)
  }

  const handleDeleteSavedForm = async () => {
    if (!formToDelete) return

    setDeleteLoading(true)
    try {
      const response = await fetch(
        `/api/form-builder/delete-json?fileName=${encodeURIComponent(formToDelete.fileName)}`,
        { method: 'DELETE' }
      )
      const payload = await readJsonPayload(response)

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to delete form file.')
      }

      if (!payload) {
        throw new Error(
          'Form builder API returned non-JSON response. Configure backend API in production.'
        )
      }

      toast.success(payload.message || `Deleted ${formToDelete.fileName}`)
      setDeleteDialogOpen(false)
      setFormToDelete(null)
      void loadSavedForms()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete form file.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(schemaJson)
      toast.success('JSON copied to clipboard.')
    } catch {
      toast.error('Unable to copy JSON.')
    }
  }

  const handleDownload = () => {
    const blob = new Blob([schemaJson], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${toFieldKey(title) || 'survey-form'}.json`
    link.click()
    window.URL.revokeObjectURL(url)
    toast.success('JSON file downloaded.')
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const raw = await file.text()
      const parsed = parseBuilderState(raw)
      if (!parsed) {
        toast.error('Invalid JSON schema.')
        return
      }

      setTitle(parsed.title)
      setFormId(parsed.formId)
      setViewRoutePath(parsed.viewRoutePath)
      setHeading(parsed.heading)
      setSubHeading(parsed.subHeading)
      setDescription(parsed.description)
      setFields(parsed.fields)
      setSelectedFieldId(parsed.fields[0]?.id ?? null)
      toast.success('Form schema imported.')
    } catch {
      toast.error('Unable to read JSON file.')
    } finally {
      event.target.value = ''
    }
  }

  const clearAll = () => {
    setFields([])
    setSelectedFieldId(null)
  }

  const addOptionRow = (fieldId: string) => {
    updateField(fieldId, (field) => ({
      ...field,
      options: [...field.options, createNextOption(field.options)],
    }))
  }

  const updateOptionRow = (
    fieldId: string,
    optionIndex: number,
    key: 'value' | 'label',
    nextValue: string
  ) => {
    updateField(fieldId, (field) => ({
      ...field,
      options: field.options.map((option, index) =>
        index === optionIndex ? { ...option, [key]: nextValue } : option
      ),
    }))
  }

  const removeOptionRow = (fieldId: string, optionIndex: number) => {
    updateField(fieldId, (field) => ({
      ...field,
      options: field.options.filter((_, index) => index !== optionIndex),
    }))
  }

  const clearOptionRow = (fieldId: string, optionIndex: number) => {
    updateField(fieldId, (field) => ({
      ...field,
      options: field.options.map((option, index) =>
        index === optionIndex ? { ...option, value: '', label: '' } : option
      ),
    }))
  }

  const clearAllOptionRows = (fieldId: string) => {
    updateField(fieldId, (field) => ({
      ...field,
      options: [],
    }))
  }

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <CardTitle className='text-base'>Saved Forms (`src/data`)</CardTitle>
              <CardDescription>
                Forms saved from this builder. Click load to open a schema.
              </CardDescription>
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void loadSavedForms()}
              disabled={savedFormsLoading}
            >
              <RefreshCw className={cn('size-4', savedFormsLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className='space-y-2'>
          {savedFormsError && (
            <p className='text-destructive text-sm'>{savedFormsError}</p>
          )}
          {!savedFormsError && savedForms.length === 0 && (
            <p className='text-muted-foreground text-sm'>
              No saved form schemas found in `src/data`.
            </p>
          )}
          {savedForms.map((form) => (
            <div
              key={form.fileName}
              className='bg-muted/30 flex items-center justify-between gap-3 rounded-md border p-3'
            >
              <div className='min-w-0'>
                <p className='truncate text-sm font-medium'>{form.title}</p>
                <p className='text-muted-foreground truncate text-xs'>
                  {form.fileName} | fields: {form.fieldCount} | updated:{' '}
                  {formatDateTime(form.updatedAt)}
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <Button type='button' variant='outline' size='sm' asChild>
                  <a
                    href={buildFormViewUrl(form.viewRoutePath, form.fileName)}
                    target='_blank'
                    rel='noreferrer'
                  >
                    <ExternalLink className='size-4' />
                    Open
                  </a>
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => void handleLoadSavedForm(form.fileName)}
                >
                  <FolderOpen className='size-4' />
                  Load
                </Button>
                <Button
                  type='button'
                  variant='destructive'
                  size='sm'
                  onClick={() => handleOpenDeleteDialog(form)}
                >
                  <Trash2 className='size-4' />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setFormToDelete(null)
          }
        }}
        title='Delete Saved Form'
        desc={
          formToDelete
            ? `Are you sure you want to delete "${formToDelete.fileName}" from src/data?`
            : 'Are you sure you want to delete this form file?'
        }
        destructive
        isLoading={deleteLoading}
        confirmText={deleteLoading ? 'Deleting...' : 'Delete'}
        handleConfirm={() => void handleDeleteSavedForm()}
      />

      <Card>
        <CardHeader>
          <CardTitle>Survey Form Builder</CardTitle>
          <CardDescription>
            Drag fields into the canvas, configure field properties, and save schema as
            JSON.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='form-title'>Form Title</Label>
              <Input
                id='form-title'
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder='Enter form title'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='form-id'>Form ID</Label>
              <Input
                id='form-id'
                value={formId}
                onChange={(event) => setFormId(event.target.value)}
                placeholder='Enter form ID'
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='view-route-path'>Form View Route Path</Label>
            <Input
              id='view-route-path'
              value={viewRoutePath}
              onChange={(event) => setViewRoutePath(event.target.value)}
              placeholder='/test-form'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='form-heading'>Heading</Label>
            <Input
              id='form-heading'
              value={heading}
              onChange={(event) => setHeading(event.target.value)}
              placeholder='Enter form heading'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='form-sub-heading'>Sub Heading</Label>
            <Input
              id='form-sub-heading'
              value={subHeading}
              onChange={(event) => setSubHeading(event.target.value)}
              placeholder='Enter form sub heading'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='form-description'>Description</Label>
            <Textarea
              id='form-description'
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder='Write a short description'
              className='min-h-24'
            />
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button type='button' onClick={handleSaveDraft}>
              <Save />
              Save Draft
            </Button>
            <Button type='button' onClick={handleSaveToSrcData}>
              <Save />
              Save to src/data
            </Button>
            <Button type='button' variant='outline' onClick={handleDownload}>
              <Download />
              Download JSON
            </Button>
            <Button type='button' variant='outline' onClick={handleCopyJson}>
              <Copy />
              Copy JSON
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload />
              Import JSON
            </Button>
            <Button type='button' variant='destructive' onClick={clearAll}>
              <Trash2 />
              Clear Fields
            </Button>
            <input
              ref={fileInputRef}
              type='file'
              accept='application/json'
              className='hidden'
              onChange={handleImportFile}
            />
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_320px]'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Field Library</CardTitle>
            <CardDescription>Drag a field to canvas or click Add</CardDescription>
          </CardHeader>
          <CardContent className='space-y-2'>
            {FIELD_TEMPLATES.map((template) => (
              <div
                key={template.type}
                draggable
                onDragStart={(event) => handleLibraryDragStart(event, template.type)}
                onDragEnd={handleDragEnd}
                className='bg-muted/40 hover:bg-muted/80 flex cursor-grab items-center justify-between rounded-md border px-3 py-2'
              >
                <div>
                  <p className='text-sm font-medium'>{template.label}</p>
                  <p className='text-muted-foreground text-xs'>{template.hint}</p>
                </div>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={() => addField(template.type)}
                  className='h-7 px-2'
                >
                  <Plus className='size-4' />
                  Add
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Builder Canvas</CardTitle>
            <CardDescription>
              {fields.length > 0
                ? `Total fields: ${fields.length}`
                : 'Drop fields here to build your form'}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-2'>
            {[...Array(fields.length + 1).keys()].map((index) => (
              <div key={`drop-zone-${index}`} className='space-y-2'>
                <div
                  onDrop={(event) => handleDropAt(event, index)}
                  onDragOver={(event) => handleDragOver(event, index)}
                  onDragLeave={() => setDropIndex((current) => (current === index ? null : current))}
                  className={cn(
                    'border-border/50 h-3 rounded-md border border-dashed transition-colors',
                    dropIndex === index && 'border-primary bg-primary/10'
                  )}
                />

                {fields[index] && (
                  <div
                    draggable
                    onDragStart={(event) => handleCanvasDragStart(event, fields[index].id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedFieldId(fields[index].id)}
                    className={cn(
                      'bg-background hover:bg-muted/30 flex cursor-grab items-center justify-between rounded-md border p-3',
                      selectedFieldId === fields[index].id && 'border-primary'
                    )}
                  >
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-medium'>
                        {buildDisplayLabel(fields[index])}
                      </p>
                      <p className='text-muted-foreground truncate text-xs'>
                        key: {fields[index].key}
                      </p>
                    </div>
                    <div className='ml-3 flex items-center gap-2'>
                      <Badge variant='secondary'>{fields[index].type}</Badge>
                      <GripVertical className='text-muted-foreground size-4' />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Field Settings</CardTitle>
            <CardDescription>
              {selectedField ? 'Edit selected field' : 'Select a field from canvas'}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {!selectedField && (
              <p className='text-muted-foreground text-sm'>
                Drop and select a field to configure label, key, required state, and
                options.
              </p>
            )}

            {selectedField && (
              <>
                <div className='space-y-2'>
                  <Label htmlFor='field-label'>Label</Label>
                  <Input
                    id='field-label'
                    value={selectedField.label}
                    onChange={(event) => {
                      const nextLabel = event.target.value
                      updateField(selectedField.id, (field) => {
                        const next = { ...field, label: nextLabel }
                        if (!field.key || field.key === toFieldKey(field.label)) {
                          next.key = ensureUniqueFieldKey(nextLabel, fields, field.id)
                        }
                        return next
                      })
                    }}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='field-key'>Field Key</Label>
                  <Input
                    id='field-key'
                    value={selectedField.key}
                    onChange={(event) =>
                      updateField(selectedField.id, (field) => ({
                        ...field,
                        key: ensureUniqueFieldKey(event.target.value, fields, field.id),
                      }))
                    }
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='field-number'>Field Number</Label>
                  <Input
                    id='field-number'
                    value={selectedField.fieldNumber}
                    onChange={(event) =>
                      updateField(selectedField.id, (field) => ({
                        ...field,
                        fieldNumber: event.target.value,
                      }))
                    }
                    placeholder='e.g. 01'
                  />
                </div>

                {supportsDisplaySpacing(selectedField.type) && (
                  <div className='space-y-3 rounded-md border p-3'>
                    <p className='text-sm font-medium'>Display Spacing</p>
                    <div className='space-y-2'>
                      <Label htmlFor='field-section-padding'>Padding</Label>
                      <Input
                        id='field-section-padding'
                        value={selectedField.sectionPadding}
                        onChange={(event) =>
                          updateField(selectedField.id, (field) => ({
                            ...field,
                            sectionPadding: event.target.value,
                          }))
                        }
                        placeholder='e.g. 8px 12px'
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='field-section-margin'>Margin</Label>
                      <Input
                        id='field-section-margin'
                        value={selectedField.sectionMargin}
                        onChange={(event) =>
                          updateField(selectedField.id, (field) => ({
                            ...field,
                            sectionMargin: event.target.value,
                          }))
                        }
                        placeholder='e.g. 16px 0'
                      />
                    </div>
                  </div>
                )}

                {!isDisplayOnlyFieldType(selectedField.type) && (
                  <div className='space-y-2'>
                    <Label htmlFor='field-placeholder'>Placeholder</Label>
                    <Input
                      id='field-placeholder'
                      value={selectedField.placeholder}
                      onChange={(event) =>
                        updateField(selectedField.id, (field) => ({
                          ...field,
                          placeholder: event.target.value,
                        }))
                      }
                    />
                  </div>
                )}

                {!isDisplayOnlyFieldType(selectedField.type) && (
                  <div className='flex items-center justify-between rounded-md border p-3'>
                    <Label htmlFor='field-required'>Required</Label>
                    <Switch
                      id='field-required'
                      checked={selectedField.required}
                      onCheckedChange={(checked) =>
                        updateField(selectedField.id, (field) => ({
                          ...field,
                          required: checked,
                        }))
                      }
                    />
                  </div>
                )}

                {!isDisplayOnlyFieldType(selectedField.type) && (
                  <div className='flex items-center justify-between rounded-md border p-3'>
                    <Label htmlFor='field-disabled'>Disabled</Label>
                    <Switch
                      id='field-disabled'
                      checked={selectedField.disabled}
                      onCheckedChange={(checked) =>
                        updateField(selectedField.id, (field) => ({
                          ...field,
                          disabled: checked,
                        }))
                      }
                    />
                  </div>
                )}

                {isChoiceField(selectedField.type) && (
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between gap-2'>
                      <Label>Options</Label>
                      <div className='flex items-center gap-2'>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={() => addOptionRow(selectedField.id)}
                        >
                          <Plus className='size-4' />
                          Add
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={() => clearAllOptionRows(selectedField.id)}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                    <div className='space-y-3 rounded-md border p-3'>
                      {selectedField.options.length === 0 && (
                        <p className='text-muted-foreground text-sm'>
                          No options added. Click Add to create options.
                        </p>
                      )}

                      {selectedField.options.map((option, index) => (
                        <div
                          key={`${selectedField.id}-option-${index}`}
                          className='rounded-md border p-3'
                        >
                          <div className='grid gap-2 sm:grid-cols-2'>
                            <div className='min-w-0 space-y-1'>
                              <Label
                                htmlFor={`${selectedField.id}-option-value-${index}`}
                                className='text-muted-foreground text-xs'
                              >
                                Option Value
                              </Label>
                              <Input
                                id={`${selectedField.id}-option-value-${index}`}
                                value={option.value}
                                onChange={(event) =>
                                  updateOptionRow(
                                    selectedField.id,
                                    index,
                                    'value',
                                    event.target.value
                                  )
                                }
                                placeholder='option_1'
                              />
                            </div>
                            <div className='min-w-0 space-y-1'>
                              <Label
                                htmlFor={`${selectedField.id}-option-label-${index}`}
                                className='text-muted-foreground text-xs'
                              >
                                Option Label
                              </Label>
                              <Input
                                id={`${selectedField.id}-option-label-${index}`}
                                value={option.label}
                                onChange={(event) =>
                                  updateOptionRow(
                                    selectedField.id,
                                    index,
                                    'label',
                                    event.target.value
                                  )
                                }
                                placeholder='Option 1'
                              />
                            </div>
                          </div>
                          <div className='mt-2 flex justify-end gap-2'>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              className='size-8'
                              aria-label='Clear option'
                              title='Clear'
                              onClick={() => clearOptionRow(selectedField.id, index)}
                            >
                              <X className='size-4' />
                            </Button>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              className='text-destructive hover:text-destructive size-8'
                              aria-label='Remove option'
                              title='Remove'
                              onClick={() => removeOptionRow(selectedField.id, index)}
                            >
                              <Trash2 className='size-4' />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  type='button'
                  variant='destructive'
                  className='w-full'
                  onClick={() => removeField(selectedField.id)}
                >
                  <Trash2 />
                  Remove Field
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-4 xl:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Form Preview</CardTitle>
            <CardDescription>Read-only preview generated from builder schema</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {fields.length === 0 && (
              <p className='text-muted-foreground text-sm'>
                No fields available. Drag fields from library to start.
              </p>
            )}
            {fields.map((field) => (
              <div key={field.id} className='space-y-2'>
                {isDisplayOnlyFieldType(field.type) ? (
                  renderPreviewField(field)
                ) : (
                  <>
                    <Label>
                      {buildDisplayLabel(field)}
                      {field.required && <span className='text-destructive'> *</span>}
                    </Label>
                    {renderPreviewField(field)}
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Generated JSON</CardTitle>
            <CardDescription>Use download or copy to store this schema</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea value={schemaJson} readOnly className='font-mono text-xs' />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

