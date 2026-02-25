import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { toast } from 'sonner'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel as SelectGroupLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type SelectOption = {
  value: string
  label: string
}

type GroupedOptions = Record<string, Record<string, string>>

type SurveyDataSource = {
  ageGroupOptions: SelectOption[]
  genderOptions: SelectOption[]
  watchMethodOptions: SelectOption[]
  teleDramas: GroupedOptions
  mediaPrograms: GroupedOptions
  newsBulletins: string[]
  tvChannels: string[]
  actors: Record<string, string>
  actresses: Record<string, string>
}

type DynamicField = {
  key: string
  label: string
  required?: boolean
  placeholder?: string
  optionsSource:
    | 'routeOptions'
    | 'outletOptions'
    | 'ageGroupOptions'
    | 'genderOptions'
    | 'watchMethodOptions'
    | 'teleDramas'
    | 'mediaPrograms'
    | 'newsBulletins'
    | 'tvChannels'
    | 'actors'
    | 'actresses'
  disabled?: boolean
}

type DynamicSection = {
  id: string
  title: string
  subtitle?: string
  fields: DynamicField[]
}

type SurveyFormConfig = {
  title: string
  titleSi: string
  introEn: string
  introSi: string
  sections: DynamicSection[]
}

type SurveyConfig = SurveyDataSource & {
  routeOptions: SelectOption[]
  outletOptions: SelectOption[]
  formConfig: SurveyFormConfig
  submissions?: Array<Record<string, unknown>>
}

type FieldErrors = Record<string, string>
type FormValues = Record<string, string>

const surveyDataUrl = new URL('../../data/survey.json', import.meta.url).href
const localSubmissionKey = 'people-award-survey-submissions'

function normalizeQueryValue(rawValue: string): string {
  const withSpaces = rawValue.replace(/\+/g, ' ')
  let decoded = withSpaces
  try {
    decoded = decodeURIComponent(withSpaces)
  } catch {
    decoded = withSpaces
  }

  const trimmed = decoded.trim()
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))

  const unwrapped = quoted ? trimmed.slice(1, -1).trim() : trimmed
  return unwrapped.replace(/\s+/g, ' ')
}

function getFirstQueryValue(
  query: Record<string, string>,
  keys: readonly string[]
): string {
  for (const key of keys) {
    const value = query[key]
    if (value) return value
  }
  return ''
}

function normalizeQueryParams(search: string): Record<string, string> {
  const params = new URLSearchParams(search)
  const query: Record<string, string> = {}
  params.forEach((value, key) => {
    const normalizedValue = normalizeQueryValue(value)
    if (normalizedValue.length > 0) query[key] = normalizedValue
  })
  return query
}

function normalizeQueryParamsFromUnknown(
  search: unknown
): Record<string, string> {
  if (!search) {
    return {}
  }

  if (typeof search === 'string') {
    return normalizeQueryParams(search)
  }

  if (search instanceof URLSearchParams) {
    return normalizeQueryParams(search.toString())
  }

  if (typeof search !== 'object' || Array.isArray(search)) {
    return {}
  }

  const query: Record<string, string> = {}
  Object.entries(search as Record<string, unknown>).forEach(([key, value]) => {
    if (typeof value === 'string') {
      const normalizedValue = normalizeQueryValue(value)
      if (normalizedValue.length > 0) query[key] = normalizedValue
      return
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      query[key] = normalizeQueryValue(String(value))
      return
    }
    if (Array.isArray(value) && value.length > 0) {
      const normalizedValue = normalizeQueryValue(String(value[0]))
      if (normalizedValue.length > 0) query[key] = normalizedValue
    }
  })
  return query
}

function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function shuffleRecord(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(shuffleArray(Object.entries(record)))
}

function shuffleGrouped(record: GroupedOptions): GroupedOptions {
  return Object.fromEntries(
    shuffleArray(Object.entries(record)).map(([groupName, entries]) => [
      groupName,
      shuffleRecord(entries),
    ])
  )
}

function randomizeSurveyData(data: SurveyConfig): SurveyConfig {
  return {
    ...data,
    teleDramas: shuffleGrouped(data.teleDramas),
    mediaPrograms: shuffleGrouped(data.mediaPrograms),
    newsBulletins: shuffleArray(data.newsBulletins),
    tvChannels: shuffleArray(data.tvChannels),
    actors: shuffleRecord(data.actors),
    actresses: shuffleRecord(data.actresses),
  }
}

function resolvePrefilledSelection(
  value: string,
  options: SelectOption[],
  prefix: string
): string {
  if (!value) return ''
  if (options.some((option) => option.value === value)) return value
  const prefixedValue = `${prefix}-${value}`
  if (options.some((option) => option.value === prefixedValue)) {
    return prefixedValue
  }
  return value
}

function resolveSelectionValueFromQuery(
  value: string,
  label: string,
  options: SelectOption[],
  prefix: string
): string {
  if (!value) return ''
  if (label) return value
  return resolvePrefilledSelection(value, options, prefix)
}

function withPrefilledOption(
  options: SelectOption[],
  value: string,
  label: string
): SelectOption[] {
  if (!value || options.some((option) => option.value === value)) {
    return options
  }
  return [{ value, label }, ...options]
}

function deriveRouteValue(query: Record<string, string>): string {
  const direct = getFirstQueryValue(query, [
    'routeId',
    'RouteId',
    'route',
    'Route',
    'routeCode',
    'RouteCode',
  ])
  if (direct) return direct

  const dealerCode = query.DealerCode ?? query.dealerCode
  if (!dealerCode) return ''

  const [routeSegment] = dealerCode.split('/').filter(Boolean)
  return routeSegment ?? ''
}

function deriveOutletValue(query: Record<string, string>): string {
  const direct = getFirstQueryValue(query, [
    'outletId',
    'OutletId',
    'outlet',
    'Outlet',
    'outletCode',
    'OutletCode',
  ])
  if (direct) return direct

  const dealerCode = query.DealerCode ?? query.dealerCode
  if (dealerCode) {
    const [, outletSegment] = dealerCode.split('/').filter(Boolean)
    if (outletSegment) return outletSegment
  }

  return query.unique_id ?? ''
}

function buildInitialValues(
  config: SurveyConfig | null,
  routeValue: string,
  outletValue: string
): FormValues {
  if (!config) return {}

  const fields = config.formConfig.sections.flatMap((section) => section.fields)
  const values = Object.fromEntries(fields.map((field) => [field.key, '']))

  values.route = routeValue
  values.outlet = outletValue

  return values
}

function renderGroupedOptions(data: GroupedOptions) {
  return Object.entries(data).map(([group, entries]) => (
    <SelectGroup key={group}>
      <SelectGroupLabel>{group}</SelectGroupLabel>
      {Object.entries(entries).map(([key, label]) => (
        <SelectItem key={`${group}-${key}`} value={`${group} - ${key}`}>
          {label}
        </SelectItem>
      ))}
    </SelectGroup>
  ))
}

export function PeopleAward() {
  const locationSearch = useLocation({ select: (location) => location.search })
  const locationHref = useLocation({ select: (location) => location.href })

  const queryParams = useMemo(
    () => {
      const fromWindowSearch =
        typeof window !== 'undefined'
          ? normalizeQueryParams(window.location.search)
          : {}
      if (Object.keys(fromWindowSearch).length > 0) {
        return fromWindowSearch
      }

      const fromRouterSearch = normalizeQueryParamsFromUnknown(locationSearch)
      if (Object.keys(fromRouterSearch).length > 0) return fromRouterSearch

      const hrefSource =
        typeof window !== 'undefined' && window.location.href
          ? window.location.href
          : locationHref
      const queryIndex = hrefSource.indexOf('?')
      if (queryIndex >= 0) {
        const fromHref = normalizeQueryParams(hrefSource.slice(queryIndex))
        if (Object.keys(fromHref).length > 0) return fromHref
      }

      return {}
    },
    [locationSearch, locationHref]
  )

  const repUserName = useMemo(
    () => getFirstQueryValue(queryParams, ['repUserName', 'RepUserName']),
    [queryParams]
  )
  const dealerCode = useMemo(
    () => getFirstQueryValue(queryParams, ['DealerCode', 'dealerCode']),
    [queryParams]
  )
  const outletName = useMemo(
    () => getFirstQueryValue(queryParams, ['outletName', 'OutletName']),
    [queryParams]
  )
  const routeName = useMemo(
    () => getFirstQueryValue(queryParams, ['routeName', 'RouteName']),
    [queryParams]
  )

  const [config, setConfig] = useState<SurveyConfig | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<FormValues>({})
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  useEffect(() => {
    let active = true

    const loadConfig = async () => {
      try {
        const response = await fetch(surveyDataUrl)
        if (!response.ok) {
          throw new Error(`Failed to load survey config: ${response.status}`)
        }
        const json = (await response.json()) as SurveyConfig
        const randomized = randomizeSurveyData(json)

        if (active) {
          setConfig(randomized)
          setLoadError(null)
        }
      } catch {
        if (active) {
          setLoadError('Failed to load survey configuration.')
        }
      }
    }

    loadConfig()
    return () => {
      active = false
    }
  }, [])

  const routeOptions = useMemo(() => {
    const base = config?.routeOptions ?? []
    const resolved = resolveSelectionValueFromQuery(
      deriveRouteValue(queryParams),
      routeName,
      base,
      'route'
    )
    return withPrefilledOption(base, resolved, routeName || `Route: ${resolved}`)
  }, [config?.routeOptions, queryParams, routeName])

  const outletOptions = useMemo(() => {
    const base = config?.outletOptions ?? []
    const resolved = resolveSelectionValueFromQuery(
      deriveOutletValue(queryParams),
      outletName,
      base,
      'outlet'
    )
    return withPrefilledOption(
      base,
      resolved,
      outletName || `Outlet: ${resolved}`
    )
  }, [config?.outletOptions, queryParams, outletName])

  const selectedRouteValue = useMemo(
    () =>
      resolveSelectionValueFromQuery(
        deriveRouteValue(queryParams),
        routeName,
        routeOptions,
        'route'
      ),
    [queryParams, routeName, routeOptions]
  )

  const selectedOutletValue = useMemo(
    () =>
      resolveSelectionValueFromQuery(
        deriveOutletValue(queryParams),
        outletName,
        outletOptions,
        'outlet'
      ),
    [queryParams, outletName, outletOptions]
  )

  const routeInputValue = useMemo(() => {
    if (routeName) return routeName
    const fromCurrent = routeOptions.find(
      (option) => option.value === formValues.route
    )
    if (fromCurrent) return fromCurrent.label

    const fromSelected = routeOptions.find(
      (option) => option.value === selectedRouteValue
    )
    return fromSelected?.label ?? formValues.route ?? ''
  }, [formValues.route, routeName, routeOptions, selectedRouteValue])

  const outletInputValue = useMemo(() => {
    if (outletName) return outletName
    const fromCurrent = outletOptions.find(
      (option) => option.value === formValues.outlet
    )
    if (fromCurrent) return fromCurrent.label

    const fromSelected = outletOptions.find(
      (option) => option.value === selectedOutletValue
    )
    return fromSelected?.label ?? formValues.outlet ?? ''
  }, [formValues.outlet, outletName, outletOptions, selectedOutletValue])

  const initialValues = useMemo(() => {
    return buildInitialValues(config, selectedRouteValue, selectedOutletValue)
  }, [config, selectedRouteValue, selectedOutletValue])

  useEffect(() => {
    if (!config) return
    setFormValues((current) => {
      if (Object.keys(current).length === 0) return initialValues
      return {
        ...current,
        route: selectedRouteValue || current.route || '',
        outlet: selectedOutletValue || current.outlet || '',
      }
    })
  }, [config, initialValues, selectedRouteValue, selectedOutletValue])

  const allFields = useMemo(
    () => config?.formConfig.sections.flatMap((section) => section.fields) ?? [],
    [config]
  )

  const handleValueChange = (fieldKey: string, value: string) => {
    setFormValues((current) => ({ ...current, [fieldKey]: value }))
    setFieldErrors((current) => {
      if (!current[fieldKey]) return current
      const next = { ...current }
      delete next[fieldKey]
      return next
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!config) return

    const nextErrors: FieldErrors = {}
    allFields.forEach((field) => {
      if (field.required && !formValues[field.key]) {
        nextErrors[field.key] = 'This field is required.'
      }
    })

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      toast.error('Please fix validation errors and try again.')
      return
    }

    const finalDataObject = {
      ...queryParams,
      ...formValues,
    }

    try {
      const previous = localStorage.getItem(localSubmissionKey)
      const parsed = previous ? (JSON.parse(previous) as unknown[]) : []
      const next = [
        ...parsed,
        {
          submittedAt: new Date().toISOString(),
          formElements: config.formConfig.sections,
          formData: finalDataObject,
        },
      ]
      localStorage.setItem(localSubmissionKey, JSON.stringify(next))
    } catch {
      // ignore storage failures
    }

    // eslint-disable-next-line no-console
    console.log('Final Survey Data Object:', finalDataObject)

    setFieldErrors({})
    setFormValues(initialValues)
    toast.success('Survey response captured successfully.')
  }

  const handleReset = () => {
    setFieldErrors({})
    setFormValues(initialValues)
  }

  const resolveOptions = (field: DynamicField) => {
    if (!config) return null

    switch (field.optionsSource) {
      case 'routeOptions':
        return routeOptions
      case 'outletOptions':
        return outletOptions
      case 'teleDramas':
        return config.teleDramas
      case 'mediaPrograms':
        return config.mediaPrograms
      case 'ageGroupOptions':
        return config.ageGroupOptions
      case 'genderOptions':
        return config.genderOptions
      case 'watchMethodOptions':
        return config.watchMethodOptions
      case 'newsBulletins':
        return config.newsBulletins.map((value) => ({ value, label: value }))
      case 'tvChannels':
        return config.tvChannels.map((value) => ({ value, label: value }))
      case 'actors':
        return Object.entries(config.actors).map(([value, label]) => ({
          value,
          label,
        }))
      case 'actresses':
        return Object.entries(config.actresses).map(([value, label]) => ({
          value,
          label,
        }))
      default:
        return null
    }
  }

  if (loadError) {
    return (
      <Card className='mx-auto w-full max-w-3xl'>
        <CardContent className='py-6'>
          <p className='text-destructive text-sm'>{loadError}</p>
        </CardContent>
      </Card>
    )
  }

  if (!config) {
    return (
      <Card className='mx-auto w-full max-w-3xl'>
        <CardContent className='py-6'>
          <p className='text-muted-foreground text-sm'>Loading survey form...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='mx-auto w-full max-w-3xl'>
      <CardHeader className='space-y-4'>
        <CardTitle className='text-2xl leading-tight md:text-3xl'>
          {config.formConfig.title} <br />({config.formConfig.titleSi})
        </CardTitle>
        <CardDescription className='text-sm leading-relaxed md:text-base'>
          {config.formConfig.introEn}
          <br />
          {config.formConfig.introSi}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form className='space-y-8' onSubmit={handleSubmit}>
          {(repUserName || dealerCode || outletName) && (
            <section className='bg-muted/40 rounded-lg border p-4'>
              <div className='grid gap-3 md:grid-cols-3'>
                <div className='bg-background rounded-md border p-3'>
                  <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                    Rep User Name
                  </p>
                  <p className='mt-1 text-sm font-semibold'>{repUserName || '-'}</p>
                </div>
                <div className='bg-background rounded-md border p-3'>
                  <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                    Dealer Code
                  </p>
                  <p className='mt-1 text-sm font-semibold'>{dealerCode || '-'}</p>
                </div>
                <div className='bg-background rounded-md border p-3'>
                  <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                    Outlet Name
                  </p>
                  <p className='mt-1 text-sm font-semibold'>{outletName || '-'}</p>
                </div>
              </div>
            </section>
          )}

          {config.formConfig.sections.map((section) => (
            <section key={section.id} className='space-y-5'>
              <div className='space-y-1'>
                <h2 className='text-lg font-semibold'>{section.title}</h2>
                {section.subtitle && (
                  <p className='text-muted-foreground text-sm'>
                    {section.subtitle}
                  </p>
                )}
              </div>

              {section.fields.map((field) => {
                const options = resolveOptions(field)
                const isGrouped =
                  field.optionsSource === 'teleDramas' ||
                  field.optionsSource === 'mediaPrograms'
                const isTextField = field.key === 'route' || field.key === 'outlet'
                const textFieldValue =
                  field.key === 'route' ? routeInputValue : outletInputValue

                return (
                  <div key={field.key} className='space-y-2'>
                    <Label htmlFor={field.key}>
                      {field.label}{' '}
                      {field.required && (
                        <span className='text-destructive'>*</span>
                      )}
                    </Label>

                    {isTextField ? (
                      <Input
                        id={field.key}
                        name={field.key}
                        required={Boolean(field.required)}
                        value={textFieldValue}
                        readOnly
                        disabled={Boolean(field.disabled)}
                        placeholder={field.placeholder || ''}
                      />
                    ) : (
                      <Select
                        name={field.key}
                        required={Boolean(field.required)}
                        value={formValues[field.key] ?? ''}
                        onValueChange={(value) =>
                          handleValueChange(field.key, value)
                        }
                        disabled={Boolean(field.disabled)}
                      >
                        <SelectTrigger id={field.key} className='w-full'>
                          <SelectValue
                            placeholder={field.placeholder || 'Select One'}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {isGrouped && options && !Array.isArray(options)
                            ? renderGroupedOptions(options as GroupedOptions)
                            : (options as SelectOption[] | null)?.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                    )}

                    {fieldErrors[field.key] && (
                      <p className='text-destructive text-xs'>
                        {fieldErrors[field.key]}
                      </p>
                    )}
                  </div>
                )
              })}
            </section>
          ))}

          <div className='flex justify-end gap-2'>
            <Button type='button' variant='outline' onClick={handleReset}>
              Reset
            </Button>
            <Button type='submit'>Save Survey</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
