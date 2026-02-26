import {
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useLocation } from '@tanstack/react-router'
import { saveSurveyData } from '@/services/survey/surveyAPI'
import { findOutletById } from '@/services/userDemarcation/endpoints'
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
  SelectItem,
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
    { value: 'option_1', label: 'Option 1' },
    { value: 'option_2', label: 'Option 2' },
  ]
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
                return { value: trimmed, label: trimmed }
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
              if (!value && !label) return null
              return {
                value: value || toFieldKey(label),
                label: label || value,
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

function toPositiveNumber(rawValue: string | undefined): number {
  if (!rawValue) return 0
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return parsed
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
  const [schema, setSchema] = useState<GeneratedSchema | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<FormValues>({})
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('Survey URL Query Params:', queryParams)
  }, [queryParams])

  useEffect(() => {
    const loadForm = async () => {
      setLoading(true)
      setError(null)
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
        setFormValues(createInitialValues(parsed.fields))
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
  }, [fileName])

  useEffect(() => {
    if (!schema) return

    const outletIdFromQuery = toPositiveNumber(queryParams.outletId)
    if (outletIdFromQuery <= 0) return

    let active = true

    const prefillRouteOutletNames = async () => {
      try {
        const outletResponse = await findOutletById(outletIdFromQuery)
        const outletPayload =
          outletResponse?.payload && typeof outletResponse.payload === 'object'
            ? (outletResponse.payload as Record<string, unknown>)
            : null

        const routeNameRaw = outletPayload?.routeName
        const outletNameRaw = outletPayload?.outletName
        const routeName =
          typeof routeNameRaw === 'string' ? routeNameRaw.trim() : ''
        const outletName =
          typeof outletNameRaw === 'string' ? outletNameRaw.trim() : ''

        if (!active || (!routeName && !outletName)) return

        setFormValues((current) => {
          const next = { ...current }

          schema.fields.forEach((field) => {
            if (typeof next[field.key] !== 'string') return

            if (routeName && isRouteDisplayField(field)) {
              next[field.key] = routeName
            }

            if (outletName && isOutletDisplayField(field)) {
              next[field.key] = outletName
            }
          })

          return next
        })
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Prefill route/outlet from findOutletById failed:', error)
      }
    }

    void prefillRouteOutletNames()

    return () => {
      active = false
    }
  }, [schema, queryParams.outletId])

  const canSubmit = useMemo(() => schema && schema.fields.length > 0, [schema])

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

    // eslint-disable-next-line no-console
    console.log('Save Survey Click - All Form Data:', {
      fileName,
      formId: schema.formId,
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

      const outletIdFromQuery = toPositiveNumber(queryParams.outletId)
      let outletPayload: Record<string, unknown> | null = null

      if (outletIdFromQuery > 0) {
        try {
          const outletResponse = await findOutletById(outletIdFromQuery)
          outletPayload =
            outletResponse?.payload &&
            typeof outletResponse.payload === 'object'
              ? (outletResponse.payload as Record<string, unknown>)
              : null
        } catch (outletError) {
          // eslint-disable-next-line no-console
          console.warn('findOutletById failed:', outletError)
        }
      }

      const routeIdFromOutlet =
        typeof outletPayload?.routeId === 'number'
          ? outletPayload.routeId
          : toNumber(
              typeof outletPayload?.routeId === 'string'
                ? outletPayload.routeId
                : undefined,
              0
            )
      const agencyCodeFromOutlet =
        typeof outletPayload?.agencyCode === 'number'
          ? outletPayload.agencyCode
          : toNumber(
              typeof outletPayload?.agencyCode === 'string'
                ? outletPayload.agencyCode
                : undefined,
              0
            )
      const routeCodeFromOutlet =
        typeof outletPayload?.routeCode === 'number'
          ? outletPayload.routeCode
          : toNumber(
              typeof outletPayload?.routeCode === 'string'
                ? outletPayload.routeCode
                : undefined,
              0
            )
      const shopCodeFromOutlet =
        typeof outletPayload?.shopCode === 'number'
          ? outletPayload.shopCode
          : toNumber(
              typeof outletPayload?.shopCode === 'string'
                ? outletPayload.shopCode
                : undefined,
              0
            )

      const routeId = toNumber(queryParams.routeId, routeIdFromOutlet)
      const outletId = toNumber(queryParams.outletId, shopCodeFromOutlet)
      const agencyCode = agencyCodeFromOutlet
      const routeCode = routeCodeFromOutlet || routeId
      const shopCode = shopCodeFromOutlet || outletId
      const dealerCode = `${agencyCode}/${routeCode}/${shopCode}`
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

      await saveSurveyData(payload)
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
    setFormValues(createInitialValues(schema.fields))
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
        <form className='space-y-5' onSubmit={handleSubmit}>
          {schema.fields.map((field) => {
            const value = formValues[field.key]
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

                {(field.type === 'text' ||
                  field.type === 'email' ||
                  field.type === 'number' ||
                  field.type === 'date') && (
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

                {field.type === 'textarea' && (
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

                {field.type === 'select' && (
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
                      {field.options.map((option) => (
                        <SelectItem
                          key={`${field.id}-${option.value}`}
                          value={option.value}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {field.type === 'radio' && (
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

                {field.type === 'checkbox' && (
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
                              const next = Boolean(isChecked)
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
