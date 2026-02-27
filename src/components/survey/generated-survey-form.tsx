import {
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useLocation } from '@tanstack/react-router'
import { CircleCheck } from 'lucide-react'
import { saveSurveyData } from '@/services/survey/surveyAPI'
import { toast } from 'sonner'
import {
  getFormSchemaFromBlob,
  isBlobStorageConfigured,
} from '@/lib/form-builder-blob'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type GeneratedFieldType =
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

type GeneratedFieldOption = {
  value: string
  label: string
  group: string
}

type GeneratedField = {
  id: string
  type: GeneratedFieldType
  fieldNumber: string
  sectionPadding: string
  sectionMargin: string
  key: string
  label: string
  placeholder: string
  required: boolean
  disabled: boolean
  shuffleOptions: boolean
  options: GeneratedFieldOption[]
}

type GeneratedSchema = {
  schemaVersion: number
  formId: string
  title: string
  heading: string
  subHeading: string
  description: string
  fields: GeneratedField[]
  updatedAt: string
}

type GeneratedSurveyFormProps = {
  fileName: string
}

type FormValue = string | string[]
type FormValues = Record<string, FormValue>
type FormErrors = Record<string, string>
type ReadSchemaApiResponse = {
  data?: unknown
  message?: string
}

const ALLOWED_FIELD_TYPES: GeneratedFieldType[] = [
  'section-heading',
  'small-text',
  'text',
  'textarea',
  'number',
  'email',
  'date',
  'select',
  'radio',
  'checkbox',
]
const DEFAULT_SELECT_VALUE = '__select_one_default__'
const BUNDLED_FORM_SCHEMAS = import.meta.glob('/src/data/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>

function toFieldKey(rawValue: string) {
  const cleaned = rawValue
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return cleaned.length > 0 ? cleaned : 'field'
}

function buildDisplayLabel(
  field: Pick<GeneratedField, 'fieldNumber' | 'label'>
): string {
  const trimmedNumber = field.fieldNumber.trim()
  if (!trimmedNumber) return field.label
  return `${trimmedNumber}. ${field.label}`
}

function createDefaultOptions(): GeneratedFieldOption[] {
  return [
    { value: 'option_1', label: 'Option 1', group: '' },
    { value: 'option_2', label: 'Option 2', group: '' },
  ]
}

function splitChoiceOptionsByGroup(options: GeneratedFieldOption[]): {
  ungrouped: GeneratedFieldOption[]
  groups: Array<{ label: string; options: GeneratedFieldOption[] }>
} {
  const ungrouped: GeneratedFieldOption[] = []
  const grouped = new Map<string, GeneratedFieldOption[]>()
  const groupOrder: string[] = []

  options.forEach((option) => {
    const groupLabel = option.group.trim()
    if (!groupLabel) {
      ungrouped.push(option)
      return
    }

    if (!grouped.has(groupLabel)) {
      grouped.set(groupLabel, [])
      groupOrder.push(groupLabel)
    }
    grouped.get(groupLabel)?.push(option)
  })

  return {
    ungrouped,
    groups: groupOrder.map((label) => ({
      label,
      options: grouped.get(label) ?? [],
    })),
  }
}

function getDisplayFieldStyle(
  field: Pick<GeneratedField, 'sectionPadding' | 'sectionMargin'>
): CSSProperties | undefined {
  const padding = field.sectionPadding.trim()
  const margin = field.sectionMargin.trim()
  if (!padding && !margin) return undefined

  return {
    ...(padding ? { padding } : {}),
    ...(margin ? { margin } : {}),
  }
}

function shuffleFieldOptions(
  options: GeneratedFieldOption[]
): GeneratedFieldOption[] {
  const next = [...options]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = next[index]
    next[index] = next[swapIndex]
    next[swapIndex] = current
  }
  return next
}

function sanitizeSchema(rawValue: unknown): GeneratedSchema | null {
  if (!rawValue || typeof rawValue !== 'object') return null

  const source = rawValue as Partial<GeneratedSchema>
  const sourceFields = Array.isArray(source.fields) ? source.fields : []
  const usedKeys = new Set<string>()

  const fields: GeneratedField[] = sourceFields
    .map((rawField, index) => {
      if (!rawField || typeof rawField !== 'object') return null
      const field = rawField as Partial<GeneratedField>
      if (!field.type || !ALLOWED_FIELD_TYPES.includes(field.type)) return null

      const label =
        typeof field.label === 'string' && field.label.trim().length > 0
          ? field.label.trim()
          : `Field ${index + 1}`

      const baseKey =
        typeof field.key === 'string' && field.key.trim().length > 0
          ? toFieldKey(field.key)
          : toFieldKey(label)

      let key = baseKey
      let counter = 2
      while (usedKeys.has(key)) {
        key = `${baseKey}_${counter}`
        counter += 1
      }
      usedKeys.add(key)

      const options = Array.isArray(field.options)
        ? (field.options as unknown[])
            .map((option): GeneratedFieldOption | null => {
              if (typeof option === 'string') {
                const trimmed = option.trim()
                if (!trimmed) return null
                return { value: trimmed, label: trimmed, group: '' }
              }
              if (!option || typeof option !== 'object') return null
              const rawOption = option as Partial<GeneratedFieldOption>
              const value =
                typeof rawOption.value === 'string'
                  ? rawOption.value.trim()
                  : ''
              const label =
                typeof rawOption.label === 'string'
                  ? rawOption.label.trim()
                  : ''
              const group =
                field.type === 'select' && typeof rawOption.group === 'string'
                  ? rawOption.group.trim()
                  : ''
              if (!value && !label) return null
              return {
                value: value || toFieldKey(label),
                label: label || value,
                group,
              }
            })
            .filter((option): option is GeneratedFieldOption => Boolean(option))
        : []

      const normalizedOptions =
        field.type === 'select' ||
        field.type === 'radio' ||
        field.type === 'checkbox'
          ? options.length > 0
            ? options
            : createDefaultOptions()
          : []

      return {
        id:
          typeof field.id === 'string' && field.id.trim().length > 0
            ? field.id
            : `${key}-${index}`,
        type: field.type,
        fieldNumber:
          typeof field.fieldNumber === 'string' ? field.fieldNumber.trim() : '',
        sectionPadding:
          (field.type === 'section-heading' || field.type === 'small-text') &&
          typeof field.sectionPadding === 'string'
            ? field.sectionPadding.trim()
            : '',
        sectionMargin:
          (field.type === 'section-heading' || field.type === 'small-text') &&
          typeof field.sectionMargin === 'string'
            ? field.sectionMargin.trim()
            : '',
        key,
        label,
        placeholder:
          typeof field.placeholder === 'string'
            ? field.placeholder
            : field.type === 'select'
              ? 'Select One'
              : `Enter ${label.toLowerCase()}`,
        required: Boolean(field.required),
        disabled: Boolean(field.disabled),
        shuffleOptions:
          field.type === 'select' && typeof field.shuffleOptions === 'boolean'
            ? field.shuffleOptions
            : false,
        options: normalizedOptions,
      }
    })
    .filter((field): field is GeneratedField => Boolean(field))

  return {
    schemaVersion:
      typeof source.schemaVersion === 'number' ? source.schemaVersion : 1,
    formId:
      typeof source.formId === 'string' && source.formId.trim().length > 0
        ? source.formId
        : 'generated_form',
    title:
      typeof source.title === 'string' && source.title.trim().length > 0
        ? source.title
        : 'Generated Form',
    heading: typeof source.heading === 'string' ? source.heading : '',
    subHeading: typeof source.subHeading === 'string' ? source.subHeading : '',
    description:
      typeof source.description === 'string' ? source.description : '',
    fields,
    updatedAt:
      typeof source.updatedAt === 'string'
        ? source.updatedAt
        : new Date().toISOString(),
  }
}

function createInitialValues(fields: GeneratedField[]): FormValues {
  const values: FormValues = {}

  fields.forEach((field) => {
    values[field.key] = field.type === 'checkbox' ? [] : ''
  })

  return values
}

function hasRequiredValue(field: GeneratedField, value: FormValue): boolean {
  if (field.type === 'checkbox') {
    return Array.isArray(value) && value.length > 0
  }
  return typeof value === 'string' && value.trim().length > 0
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error.'
}

function getBundledSchemaByFileName(fileName: string): unknown | null {
  const normalizedName = fileName.trim().toLowerCase()
  if (!normalizedName) return null

  for (const [path, schema] of Object.entries(BUNDLED_FORM_SCHEMAS)) {
    const pathSegments = path.split('/')
    const currentFileName = pathSegments[pathSegments.length - 1]?.toLowerCase()
    if (currentFileName === normalizedName) {
      return schema
    }
  }

  return null
}

function parseJsonText(rawText: string): unknown {
  return JSON.parse(rawText) as unknown
}

function getQueryParamsFromLocationHref(
  locationHref: string
): Record<string, string> {
  const queryIndex = locationHref.indexOf('?')
  const search = queryIndex >= 0 ? locationHref.slice(queryIndex + 1) : ''
  return Object.fromEntries(new URLSearchParams(search).entries())
}

function toNumber(rawValue: string | undefined, fallback = 0): number {
  if (!rawValue) return fallback
  const parsed = Number(rawValue)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toLooseNumber(rawValue: string | undefined, fallback = 0): number {
  if (!rawValue) return fallback
  const normalized = rawValue.replace(/%/g, '').trim()
  const direct = Number(normalized)
  if (Number.isFinite(direct)) return direct

  const matched = normalized.match(/-?\d+(\.\d+)?/)
  if (!matched) return fallback
  const parsed = Number(matched[0])
  return Number.isFinite(parsed) ? parsed : fallback
}

function toDateTimeParts(now = new Date()) {
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  const hour = `${now.getHours()}`.padStart(2, '0')
  const minute = `${now.getMinutes()}`.padStart(2, '0')
  const second = `${now.getSeconds()}`.padStart(2, '0')

  return {
    surveyDate: `${year}-${month}-${day}`,
    surveyTime: `${hour}:${minute}:${second}`,
    uniqueId: `${year}${month}${day}${hour}${minute}${second}`,
  }
}

function formValueToString(value: FormValue): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', ')
  }
  return value.trim()
}

function isRouteDisplayField(
  field: Pick<GeneratedField, 'key' | 'label'>
): boolean {
  const key = field.key.trim().toLowerCase()
  const label = field.label.trim().toLowerCase()
  return (
    key === 'route' ||
    key === 'route_id' ||
    key === 'routeid' ||
    label === 'route' ||
    label.includes('select route')
  )
}

function isOutletDisplayField(
  field: Pick<GeneratedField, 'key' | 'label'>
): boolean {
  const key = field.key.trim().toLowerCase()
  const label = field.label.trim().toLowerCase()
  return (
    key === 'outlet' ||
    key === 'outlet_id' ||
    key === 'outletid' ||
    label === 'outlet' ||
    label.includes('select outlet')
  )
}

function applyRouteOutletPrefill(
  fields: GeneratedField[],
  currentValues: FormValues,
  routeName: string,
  outletName: string
): FormValues {
  if (!routeName && !outletName) return currentValues

  const next = { ...currentValues }
  fields.forEach((field) => {
    if (typeof next[field.key] !== 'string') return

    if (routeName && isRouteDisplayField(field)) {
      next[field.key] = routeName
    }

    if (outletName && isOutletDisplayField(field)) {
      next[field.key] = outletName
    }
  })

  return next
}

async function loadSchemaFromApi(fileName: string): Promise<unknown> {
  const response = await fetch(
    `/api/form-builder/read-json?fileName=${encodeURIComponent(fileName)}`
  )
  const rawText = await response.text()

  let payload: ReadSchemaApiResponse | null = null
  if (rawText.trim()) {
    try {
      payload = parseJsonText(rawText) as ReadSchemaApiResponse
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    throw new Error(payload?.message || 'API failed to load generated form.')
  }

  if (!payload || payload.data === undefined) {
    throw new Error('API returned non-JSON response.')
  }

  return payload.data
}

async function loadSchemaFromBlob(fileName: string): Promise<unknown> {
  if (!isBlobStorageConfigured()) {
    throw new Error('Azure Blob storage not configured.')
  }
  return getFormSchemaFromBlob(fileName)
}

async function loadSchemaFromPublicData(fileName: string): Promise<unknown> {
  const response = await fetch(`/data/${encodeURIComponent(fileName)}`)
  if (!response.ok) {
    throw new Error(`Form file "${fileName}" not found in public/data.`)
  }

  const rawText = await response.text()
  if (!rawText.trim()) {
    throw new Error('public/data returned an empty response.')
  }

  try {
    return parseJsonText(rawText)
  } catch {
    throw new Error('public/data returned invalid JSON.')
  }
}

export function GeneratedSurveyForm({ fileName }: GeneratedSurveyFormProps) {
  const locationHref = useLocation({ select: (location) => location.href })
  const queryParams = useMemo(
    () => getQueryParamsFromLocationHref(locationHref),
    [locationHref]
  )
  const routeNameFromQuery = (queryParams.routeName ?? '').trim()
  const outletNameFromQuery = (queryParams.outletName ?? '').trim()
  const [schema, setSchema] = useState<GeneratedSchema | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<FormValues>({})
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccessStateVisible, setIsSuccessStateVisible] = useState(false)
  const [successMessage, setSuccessMessage] = useState(
    'Thank you for completing the survey.'
  )

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('Survey URL Query Params:', queryParams)
    // eslint-disable-next-line no-console
    console.log('Survey Route/Outlet from Query Params:', {
      routeName: queryParams.routeName ?? '',
      outletName: queryParams.outletName ?? '',
    })
  }, [queryParams])

  useEffect(() => {
    const loadForm = async () => {
      setLoading(true)
      setError(null)
      setIsSuccessStateVisible(false)
      setSuccessMessage('Thank you for completing the survey.')
      try {
        const loadErrors: string[] = []
        let rawSchema: unknown | null = null

        try {
          rawSchema = await loadSchemaFromBlob(fileName)
        } catch (blobError) {
          loadErrors.push(`Blob: ${errorMessage(blobError)}`)
        }

        try {
          if (!rawSchema) {
            rawSchema = await loadSchemaFromApi(fileName)
          }
        } catch (apiError) {
          loadErrors.push(`API: ${errorMessage(apiError)}`)
        }

        if (!rawSchema) {
          try {
            rawSchema = await loadSchemaFromPublicData(fileName)
          } catch (publicError) {
            loadErrors.push(`Public file: ${errorMessage(publicError)}`)
          }
        }

        if (!rawSchema) {
          rawSchema = getBundledSchemaByFileName(fileName)
          if (!rawSchema) {
            loadErrors.push(
              `Bundled file: "${fileName}" is not available at build time.`
            )
          }
        }

        if (!rawSchema) {
          throw new Error(loadErrors.join(' '))
        }

        const parsed = sanitizeSchema(rawSchema)
        if (!parsed) {
          throw new Error('Invalid generated form schema.')
        }

        setSchema(parsed)
        setFormValues(
          applyRouteOutletPrefill(
            parsed.fields,
            createInitialValues(parsed.fields),
            routeNameFromQuery,
            outletNameFromQuery
          )
        )
        setFieldErrors({})
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load generated form.'
        setError(message)
        setSchema(null)
      } finally {
        setLoading(false)
      }
    }

    void loadForm()
  }, [fileName, routeNameFromQuery, outletNameFromQuery])

  useEffect(() => {
    if (!schema) return

    const routeDisplay = (queryParams.routeName || queryParams.routeId || '').trim()
    const outletDisplay = (queryParams.outletName || queryParams.outletId || '').trim()
    if (!routeDisplay && !outletDisplay) return

    setFormValues((current) => {
      return applyRouteOutletPrefill(
        schema.fields,
        current,
        routeDisplay,
        outletDisplay
      )
    })
  }, [schema, queryParams.routeId, queryParams.routeName, queryParams.outletId, queryParams.outletName])

  const canSubmit = useMemo(() => schema && schema.fields.length > 0, [schema])
  const selectOptionsByFieldId = useMemo(() => {
    if (!schema) return {}

    return schema.fields.reduce<Record<string, GeneratedFieldOption[]>>(
      (accumulator, field) => {
        if (field.type !== 'select') return accumulator

        accumulator[field.id] =
          field.shuffleOptions && field.options.length > 1
            ? shuffleFieldOptions(field.options)
            : field.options

        return accumulator
      },
      {}
    )
  }, [schema])

  const updateValue = (fieldKey: string, value: FormValue) => {
    setFormValues((current) => ({ ...current, [fieldKey]: value }))
    setFieldErrors((current) => {
      if (!current[fieldKey]) return current
      const next = { ...current }
      delete next[fieldKey]
      return next
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!schema) return
    const routeName = queryParams.routeName ?? ''
    const outletName = queryParams.outletName ?? ''

    // eslint-disable-next-line no-console
    console.log('Save Survey Click - All Form Data:', {
      fileName,
      formId: schema.formId,
      routeName,
      outletName,
      values: formValues,
    })

    const nextErrors: FormErrors = {}
    schema.fields.forEach((field) => {
      const value = formValues[field.key]
      if (
        field.required &&
        !field.disabled &&
        !hasRequiredValue(field, value ?? '')
      ) {
        nextErrors[field.key] = 'This field is required.'
      }
    })

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      toast.error('Please fill all required fields.')
      return
    }

    try {
      setIsSubmitting(true)
      const routeId = toNumber(queryParams.routeId, 0)
      const outletId = toNumber(queryParams.outletId, 0)
      const agencyCode = toNumber(queryParams.agencyCode, 0)
      const routeCode = toNumber(queryParams.routeCode, 0)
      const shopCode = toNumber(queryParams.shopCode, 0)
      const dealerCode =
        queryParams.dealerCode || `${agencyCode}/${routeCode}/${shopCode}`
      const { surveyDate, surveyTime, uniqueId } = toDateTimeParts()

      const directQuestionValues: string[] = []
      for (let i = 1; i <= 10; i += 1) {
        directQuestionValues.push(
          formValueToString(formValues[`question${i}`] ?? '')
        )
      }

      const sequentialAnswers = schema.fields
        .filter(
          (field) =>
            field.type !== 'section-heading' &&
            field.type !== 'small-text' &&
            !field.disabled &&
            !/^question\d+$/i.test(field.key) &&
            field.key.toLowerCase() !== 'route' &&
            field.key.toLowerCase() !== 'outlet'
        )
        .map((field) => formValueToString(formValues[field.key] ?? ''))
        .filter(Boolean)

      let sequentialIndex = 0
      const questions = directQuestionValues.map((value) => {
        if (value) return value
        const next = sequentialAnswers[sequentialIndex] ?? ''
        sequentialIndex += 1
        return next
      })
      const questionPayload = questions.reduce<Record<string, string>>(
        (accumulator, questionValue, index) => {
          accumulator[`question${index + 1}`] = questionValue ?? ''
          return accumulator
        },
        {}
      )

      const payload = {
        userId: toNumber(queryParams.userId, 0),
        surveyId: schema.formId,
        uniqueId,
        auditUser: queryParams.userName ?? '',
        latitude: toNumber(queryParams.latitude, 0),
        longitude: toNumber(queryParams.longitude, 0),
        battery: toLooseNumber(queryParams.batteryLevel, 0),
        surveyDate,
        surveyTime,
        routeId,
        outletId,
        dealerCode,
        agencyCode,
        routeCode,
        shopCode,
        ...questionPayload,
        isActive: true,
      }

      // eslint-disable-next-line no-console
      console.log('saveSurveyData payload:', payload)

      const response = await saveSurveyData(payload)
      const apiMessage =
        typeof response?.message === 'string' ? response.message.trim() : ''
      setSuccessMessage(
        apiMessage || 'Thank you. Your survey response has been saved.'
      )
      setIsSuccessStateVisible(true)
      setFieldErrors({})
      toast.success('Survey saved successfully.')
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Failed to save survey.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    if (!schema) return
    setFormValues(
      applyRouteOutletPrefill(
        schema.fields,
        createInitialValues(schema.fields),
        routeNameFromQuery,
        outletNameFromQuery
      )
    )
    setFieldErrors({})
    toast.success('Form reset successfully.')
  }

  if (loading) {
    return (
      <Card className='mx-auto w-full max-w-3xl'>
        <CardHeader>
          <CardTitle>Loading Form...</CardTitle>
          <CardDescription>{fileName}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error || !schema) {
    return (
      <Card className='mx-auto w-full max-w-3xl'>
        <CardHeader>
          <CardTitle>Form Not Available</CardTitle>
          <CardDescription>{error || 'Unable to render form.'}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (isSuccessStateVisible) {
    return (
      <Card className='mx-auto w-full max-w-3xl gap-0 overflow-hidden border-emerald-200/80 py-0'>
        <CardHeader className='space-y-4 bg-gradient-to-b from-emerald-50 to-white px-6 pt-8 pb-7 text-center'>
          <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700'>
            <CircleCheck className='h-8 w-8' />
          </div>
          <CardTitle className='text-2xl sm:text-3xl'>Thank You!</CardTitle>
          <CardDescription className='mx-auto max-w-xl text-sm leading-6 text-slate-600 sm:text-base'>
            {successMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-2 pt-6 text-center text-sm text-muted-foreground'>
          <p>Your survey was submitted successfully.</p>
          {(routeNameFromQuery || outletNameFromQuery) && (
            <p className='pb-5'>
              {routeNameFromQuery ? `Route: ${routeNameFromQuery}` : ''}
              {routeNameFromQuery && outletNameFromQuery ? ' | ' : ''}
              {outletNameFromQuery ? `Outlet: ${outletNameFromQuery}` : ''}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='mx-auto w-full max-w-3xl'>
      <CardHeader className='gap-0 space-y-2'>
        {schema.heading && (
          <h2 className='text-center text-xl leading-snug font-semibold sm:text-2xl md:text-3xl lg:text-4xl'>
            {schema.heading}
          </h2>
        )}
        {schema.subHeading && (
          <p className='text-muted-foreground mt-1 block text-center text-base sm:text-xl md:text-2xl'>
            {schema.subHeading}
          </p>
        )}
        {schema.description && (
          <CardDescription>{schema.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form className='space-y-5 [&_label]:leading-[18px]' onSubmit={handleSubmit}>
          {schema.fields.map((field) => {
            const value = formValues[field.key]
            const isRouteField = isRouteDisplayField(field)
            const isOutletField = isOutletDisplayField(field)
            const routeDisplayValue =
              routeNameFromQuery ||
              (queryParams.routeId ?? '').trim() ||
              (typeof value === 'string' ? value : '')
            const outletDisplayValue =
              outletNameFromQuery ||
              (queryParams.outletId ?? '').trim() ||
              (typeof value === 'string' ? value : '')
            const selectOptions = selectOptionsByFieldId[field.id] ?? field.options
            const groupedSelectOptions =
              field.type === 'select'
                ? splitChoiceOptionsByGroup(selectOptions)
                : null
            if (field.type === 'section-heading') {
              return (
                <h2
                  key={field.id}
                  className='text-lg font-semibold'
                  style={getDisplayFieldStyle(field)}
                >
                  {buildDisplayLabel(field)}
                </h2>
              )
            }

            if (field.type === 'small-text') {
              return (
                <p
                  key={field.id}
                  className='text-muted-foreground text-sm'
                  style={getDisplayFieldStyle(field)}
                >
                  {buildDisplayLabel(field)}
                </p>
              )
            }

            return (
              <div key={field.id} className='space-y-2'>
                <Label htmlFor={field.id}>
                  {buildDisplayLabel(field)}
                  {field.required && (
                    <span className='text-destructive'> *</span>
                  )}
                </Label>

                {isRouteField && (
                  <Input
                    id={field.id}
                    value={routeDisplayValue}
                    readOnly
                    disabled
                    placeholder={field.placeholder || 'Select Route'}
                  />
                )}

                {isOutletField && (
                  <Input
                    id={field.id}
                    value={outletDisplayValue}
                    readOnly
                    disabled
                    placeholder={field.placeholder || 'Select Outlet'}
                  />
                )}

                {(field.type === 'text' ||
                  field.type === 'email' ||
                  field.type === 'number' ||
                  field.type === 'date') &&
                  !isRouteField &&
                  !isOutletField && (
                  <Input
                    id={field.id}
                    type={field.type}
                    disabled={field.disabled}
                    value={typeof value === 'string' ? value : ''}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      updateValue(field.key, event.target.value)
                    }
                  />
                )}

                {field.type === 'textarea' &&
                  !isRouteField &&
                  !isOutletField && (
                  <Textarea
                    id={field.id}
                    disabled={field.disabled}
                    value={typeof value === 'string' ? value : ''}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      updateValue(field.key, event.target.value)
                    }
                  />
                )}

                {field.type === 'select' &&
                  !isRouteField &&
                  !isOutletField && (
                  <Select
                    disabled={field.disabled}
                    value={
                      typeof value === 'string' && value
                        ? value
                        : DEFAULT_SELECT_VALUE
                    }
                    onValueChange={(nextValue) =>
                      updateValue(
                        field.key,
                        nextValue === DEFAULT_SELECT_VALUE ? '' : nextValue
                      )
                    }
                  >
                    <SelectTrigger id={field.id} className='w-full'>
                      <SelectValue
                        placeholder={field.placeholder || 'Select One'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DEFAULT_SELECT_VALUE}>
                        {field.placeholder || 'Select One'}
                      </SelectItem>
                      {groupedSelectOptions?.ungrouped.map((option, optionIndex) => (
                        <SelectItem
                          key={`${field.id}-ungrouped-${option.value}-${optionIndex}`}
                          value={option.value}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                      {groupedSelectOptions?.groups.map((group) => (
                        <SelectGroup key={`${field.id}-group-${group.label}`}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.options.map((option, optionIndex) => (
                            <SelectItem
                              key={`${field.id}-${group.label}-${option.value}-${optionIndex}`}
                              value={option.value}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {field.type === 'radio' &&
                  !isRouteField &&
                  !isOutletField && (
                  <RadioGroup
                    value={typeof value === 'string' ? value : ''}
                    onValueChange={(nextValue) =>
                      updateValue(field.key, nextValue)
                    }
                    disabled={field.disabled}
                    className='space-y-2'
                  >
                    {field.options.map((option, optionIndex) => {
                      const optionId = `${field.id}-radio-${optionIndex}`
                      return (
                        <div
                          key={`${field.id}-${option.value}`}
                          className='flex items-center gap-2'
                        >
                          <RadioGroupItem id={optionId} value={option.value} />
                          <Label
                            htmlFor={optionId}
                            className='text-sm font-normal'
                          >
                            {option.label}
                          </Label>
                        </div>
                      )
                    })}
                  </RadioGroup>
                )}

                {field.type === 'checkbox' &&
                  !isRouteField &&
                  !isOutletField && (
                  <div className='space-y-2'>
                    {field.options.map((option, optionIndex) => {
                      const checked =
                        Array.isArray(value) && value.includes(option.value)
                      const optionId = `${field.id}-checkbox-${optionIndex}`
                      return (
                        <div
                          key={`${field.id}-${option.value}`}
                          className='flex items-center gap-2'
                        >
                          <Checkbox
                            id={optionId}
                            disabled={field.disabled}
                            checked={checked}
                            onCheckedChange={(isChecked) => {
                              const current = Array.isArray(value) ? value : []
                              const next = isChecked === true
                                ? [...current, option.value]
                                : current.filter(
                                    (item) => item !== option.value
                                  )
                              updateValue(field.key, next)
                            }}
                          />
                          <Label
                            htmlFor={optionId}
                            className='text-sm font-normal'
                          >
                            {option.label}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                )}

                {fieldErrors[field.key] && (
                  <p className='text-destructive text-xs'>
                    {fieldErrors[field.key]}
                  </p>
                )}
              </div>
            )
          })}

          <div className='flex justify-end gap-2'>
            <Button type='button' variant='outline' onClick={handleReset}>
              Reset
            </Button>
            <Button type='submit' disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Survey'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
