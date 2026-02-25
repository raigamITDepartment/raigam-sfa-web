import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { toast } from 'sonner'

type SurveyData = {
  teleDramas: Record<string, Record<string, string>>
  mediaPrograms: Record<string, Record<string, string>>
  newsBulletins: string[]
  tvChannels: string[]
  actors: Record<string, string>
  actresses: Record<string, string>
}

type FieldName =
  | 'route'
  | 'outlet'
  | 'ageGroup'
  | 'gender'
  | 'watchMethod'
  | 'favoriteTeledrama'
  | 'favoriteMediaProgram'
  | 'favoriteNewsBulletin'
  | 'favoriteTvChannel'
  | 'favoriteActor'
  | 'favoriteActress'

type SurveyValues = Record<FieldName, string>
type SurveyErrors = Partial<Record<FieldName, string>>

const INITIAL_VALUES: SurveyValues = {
  route: '',
  outlet: '',
  ageGroup: '',
  gender: '',
  watchMethod: '',
  favoriteTeledrama: '',
  favoriteMediaProgram: '',
  favoriteNewsBulletin: '',
  favoriteTvChannel: '',
  favoriteActor: '',
  favoriteActress: '',
}

const REQUIRED_FIELDS: FieldName[] = [
  'route',
  'outlet',
  'ageGroup',
  'gender',
  'watchMethod',
  'favoriteTeledrama',
  'favoriteMediaProgram',
  'favoriteNewsBulletin',
  'favoriteTvChannel',
  'favoriteActor',
  'favoriteActress',
]

const surveyDataUrl = new URL('../data/survey.json', import.meta.url).href

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

function shuffleNestedRecord(
  record: Record<string, Record<string, string>>
): Record<string, Record<string, string>> {
  return Object.fromEntries(
    shuffleArray(Object.entries(record)).map(([group, entries]) => [
      group,
      shuffleRecord(entries),
    ])
  )
}

function shuffleSurveyData(data: SurveyData): SurveyData {
  return {
    teleDramas: shuffleNestedRecord(data.teleDramas),
    mediaPrograms: shuffleNestedRecord(data.mediaPrograms),
    newsBulletins: shuffleArray(data.newsBulletins),
    tvChannels: shuffleArray(data.tvChannels),
    actors: shuffleRecord(data.actors),
    actresses: shuffleRecord(data.actresses),
  }
}

function renderGroupedOptions(data: Record<string, Record<string, string>>) {
  return Object.entries(data).map(([channel, entries]) => (
    <SelectGroup key={channel}>
      <SelectGroupLabel>{channel}</SelectGroupLabel>
      {Object.entries(entries).map(([key, label]) => (
        <SelectItem key={`${channel}-${key}`} value={`${channel} - ${key}`}>
          {label}
        </SelectItem>
      ))}
    </SelectGroup>
  ))
}

function SurveyPage() {
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<SurveyValues>(INITIAL_VALUES)
  const [fieldErrors, setFieldErrors] = useState<SurveyErrors>({})

  useEffect(() => {
    let active = true

    const loadSurveyData = async () => {
      try {
        const response = await fetch(surveyDataUrl)
        if (!response.ok) {
          throw new Error(`Failed to load survey data: ${response.status}`)
        }
        const data = (await response.json()) as SurveyData
        const randomized = shuffleSurveyData(data)
        if (active) {
          setSurveyData(randomized)
          setDataError(null)
        }
      } catch {
        if (active) {
          setDataError('Failed to load survey options.')
        }
      }
    }

    loadSurveyData()

    return () => {
      active = false
    }
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationErrors: SurveyErrors = {}

    REQUIRED_FIELDS.forEach((field) => {
      if (!formValues[field]) {
        validationErrors[field] = 'This field is required.'
      }
    })

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      toast.error('Please fix validation errors and try again.')
      return
    }

    event.currentTarget.reset()
    setFieldErrors({})
    setFormValues(INITIAL_VALUES)
    toast.success('Survey response captured successfully.')
  }

  const handleValueChange = (field: FieldName, value: string) => {
    setFormValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleReset = () => {
    setFieldErrors({})
    setFormValues(INITIAL_VALUES)
  }

  const dataLoading = !surveyData && !dataError
  const dataUnavailable = !surveyData
  const actorOptions = useMemo(
    () => Object.entries(surveyData?.actors ?? {}),
    [surveyData]
  )
  const actressOptions = useMemo(
    () => Object.entries(surveyData?.actresses ?? {}),
    [surveyData]
  )

  return (
    <div className='from-background to-muted/30 flex min-h-svh items-center justify-center bg-gradient-to-b p-4 md:p-8'>
      <Card className='w-full max-w-3xl'>
        <CardHeader className='space-y-4'>
          <CardTitle className='text-2xl leading-tight md:text-3xl'>
            Survey Questionnaire - People's Award 2025 <br />
            (සමීක්ෂණ ප්‍රශ්නාවලිය - ජනගත සම්මාන 2025)
          </CardTitle>
          <CardDescription className='text-sm leading-relaxed md:text-base'>
            I would appreciate if you could take few minutes and support to
            success this survey by respond to this questionnaire. Kindly note
            that, your response will be treated as strictly confidential
            <br />
            ඔබට විනාඩි කිහිපයක් ගත කර මෙම ප්‍රශ්නාවලියට ප්‍රතිචාර දැක්වීමෙන්
            මෙම සමීක්ෂණය සාර්ථක කර ගැනීමට සහය දිය හැකි නම් මම අගය කරමි. ඔබගේ
            ප්‍රතිචාරය දැඩි ලෙස රහසිගත ලෙස සලකනු ලබන බව කරුණාවෙන් සලකන්න .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className='space-y-8' onSubmit={handleSubmit}>
            <section className='space-y-5'>
              <div>
                <h2 className='text-lg font-semibold'>Section A</h2>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='route'>
                  01. Select Route <span className='text-destructive'>*</span>
                </Label>
                <Select
                  name='route'
                  required
                  value={formValues.route}
                  onValueChange={(value) => handleValueChange('route', value)}
                >
                  <SelectTrigger id='route' className='w-full'>
                    <SelectValue placeholder='Select Route' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='route-1'>Route 1</SelectItem>
                    <SelectItem value='route-2'>Route 2</SelectItem>
                    <SelectItem value='route-3'>Route 3</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.route && (
                  <p className='text-destructive text-xs'>{fieldErrors.route}</p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='outlet'>
                  02. Select Outlet <span className='text-destructive'>*</span>
                </Label>
                <Select
                  name='outlet'
                  required
                  value={formValues.outlet}
                  onValueChange={(value) => handleValueChange('outlet', value)}
                >
                  <SelectTrigger id='outlet' className='w-full'>
                    <SelectValue placeholder='Select Outlet' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='outlet-1'>Outlet 1</SelectItem>
                    <SelectItem value='outlet-2'>Outlet 2</SelectItem>
                    <SelectItem value='outlet-3'>Outlet 3</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.outlet && (
                  <p className='text-destructive text-xs'>{fieldErrors.outlet}</p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='ageGroup'>
                  03. Age Group (වයස් කාණ්ඩය){' '}
                  <span className='text-destructive'>*</span>
                </Label>
                <Select
                  name='ageGroup'
                  required
                  value={formValues.ageGroup}
                  onValueChange={(value) => handleValueChange('ageGroup', value)}
                >
                  <SelectTrigger id='ageGroup' className='w-full'>
                    <SelectValue placeholder='Select One' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='below-25'>Below 25</SelectItem>
                    <SelectItem value='25-50'>25-50</SelectItem>
                    <SelectItem value='50-70'>50-70</SelectItem>
                    <SelectItem value='above-70'>Above 70</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.ageGroup && (
                  <p className='text-destructive text-xs'>{fieldErrors.ageGroup}</p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='gender'>
                  04. Gender (ස්ත්‍රී පුරුෂ භාවය){' '}
                  <span className='text-destructive'>*</span>
                </Label>
                <Select
                  name='gender'
                  required
                  value={formValues.gender}
                  onValueChange={(value) => handleValueChange('gender', value)}
                >
                  <SelectTrigger id='gender' className='w-full'>
                    <SelectValue placeholder='Select One' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='male'>Male</SelectItem>
                    <SelectItem value='female'>Female</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.gender && (
                  <p className='text-destructive text-xs'>{fieldErrors.gender}</p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='watchMethod'>
                  05. What is the most preferred method to watch Teledramas/ TV
                  Programs/ News? (බොහෝ දුරට ටෙලි නාට්‍ය/ රූපවාහිනී වැඩසටහන්/
                  ප්‍රවෘත්ති නැරඹීමට භාවිත කරන ක්‍රමය){' '}
                  <span className='text-destructive'>*</span>
                </Label>
                <Select
                  name='watchMethod'
                  required
                  value={formValues.watchMethod}
                  onValueChange={(value) =>
                    handleValueChange('watchMethod', value)
                  }
                >
                  <SelectTrigger id='watchMethod' className='w-full'>
                    <SelectValue placeholder='Select One' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='tv'>TV</SelectItem>
                    <SelectItem value='facebook'>Facebook</SelectItem>
                    <SelectItem value='youtube'>You Tube</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.watchMethod && (
                  <p className='text-destructive text-xs'>
                    {fieldErrors.watchMethod}
                  </p>
                )}
              </div>
            </section>

            <section className='space-y-5'>
              <div className='space-y-1'>
                <h2 className='text-lg font-semibold'>Section B - Survey</h2>
                <p className='text-muted-foreground text-sm'>
                  Raigam Tele&apos;es 2025 - People&apos;s Awards
                </p>
                {dataLoading && (
                  <p className='text-muted-foreground text-xs'>
                    Loading survey options...
                  </p>
                )}
                {dataError && (
                  <p className='text-destructive text-xs'>{dataError}</p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='favoriteTeledrama'>
                  01. What is your favorite Teledrama? (ඔබ කැමතිම
                  ටෙලිනාට්‍යය කුමක්ද?){' '}
                  <span className='text-destructive'>*</span>
                </Label>
                <Select
                  name='favoriteTeledrama'
                  required
                  value={formValues.favoriteTeledrama}
                  onValueChange={(value) =>
                    handleValueChange('favoriteTeledrama', value)
                  }
                  disabled={dataUnavailable}
                >
                  <SelectTrigger id='favoriteTeledrama' className='w-full'>
                    <SelectValue placeholder='Select One' />
                  </SelectTrigger>
                  <SelectContent>
                    {surveyData && renderGroupedOptions(surveyData.teleDramas)}
                  </SelectContent>
                </Select>
                {fieldErrors.favoriteTeledrama && (
                  <p className='text-destructive text-xs'>
                    {fieldErrors.favoriteTeledrama}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='favoriteMediaProgram'>
                  02. What is your favorite media program? (ඔබේ ප්‍රියතම මාධ්‍ය
                  වැඩසටහන කුමක්ද?){' '}
                  <span className='text-destructive'>*</span>
                </Label>
                <Select
                  name='favoriteMediaProgram'
                  required
                  value={formValues.favoriteMediaProgram}
                  onValueChange={(value) =>
                    handleValueChange('favoriteMediaProgram', value)
                  }
                  disabled={dataUnavailable}
                >
                  <SelectTrigger id='favoriteMediaProgram' className='w-full'>
                    <SelectValue placeholder='Select One' />
                  </SelectTrigger>
                  <SelectContent>
                    {surveyData && renderGroupedOptions(surveyData.mediaPrograms)}
                  </SelectContent>
                </Select>
                {fieldErrors.favoriteMediaProgram && (
                  <p className='text-destructive text-xs'>
                    {fieldErrors.favoriteMediaProgram}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='favoriteNewsBulletin'>
                  03. What is your favorite news bulletin? (ඔබේ ප්‍රියතම
                  ප්‍රවෘත්ති නාලිකාව කුමක්ද){' '}
                  <span className='text-destructive'>*</span>
                </Label>
                <Select
                  name='favoriteNewsBulletin'
                  required
                  value={formValues.favoriteNewsBulletin}
                  onValueChange={(value) =>
                    handleValueChange('favoriteNewsBulletin', value)
                  }
                  disabled={dataUnavailable}
                >
                  <SelectTrigger id='favoriteNewsBulletin' className='w-full'>
                    <SelectValue placeholder='Select One' />
                  </SelectTrigger>
                  <SelectContent>
                    {(surveyData?.newsBulletins ?? []).map((bulletin) => (
                      <SelectItem key={bulletin} value={bulletin}>
                        {bulletin}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.favoriteNewsBulletin && (
                  <p className='text-destructive text-xs'>
                    {fieldErrors.favoriteNewsBulletin}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='favoriteTvChannel'>
                  04. What is your favorite TV channel? (ඔබේ ප්‍රියතම TV
                  නාලිකාව කුමක්ද){' '}
                  <span className='text-destructive'>*</span>
                </Label>
                <Select
                  name='favoriteTvChannel'
                  required
                  value={formValues.favoriteTvChannel}
                  onValueChange={(value) =>
                    handleValueChange('favoriteTvChannel', value)
                  }
                  disabled={dataUnavailable}
                >
                  <SelectTrigger id='favoriteTvChannel' className='w-full'>
                    <SelectValue placeholder='Select One' />
                  </SelectTrigger>
                  <SelectContent>
                    {(surveyData?.tvChannels ?? []).map((channel) => (
                      <SelectItem key={channel} value={channel}>
                        {channel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.favoriteTvChannel && (
                  <p className='text-destructive text-xs'>
                    {fieldErrors.favoriteTvChannel}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='favoriteActor'>
                  05. What is your favorite Actor? (ඔබේ ප්‍රියතම නළුවා
                  කවුරුද?){' '}
                  <span className='text-destructive'>*</span>
                </Label>
                <Select
                  name='favoriteActor'
                  required
                  value={formValues.favoriteActor}
                  onValueChange={(value) =>
                    handleValueChange('favoriteActor', value)
                  }
                  disabled={dataUnavailable}
                >
                  <SelectTrigger id='favoriteActor' className='w-full'>
                    <SelectValue placeholder='Select One' />
                  </SelectTrigger>
                  <SelectContent>
                    {actorOptions.map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.favoriteActor && (
                  <p className='text-destructive text-xs'>
                    {fieldErrors.favoriteActor}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='favoriteActress'>
                  06. What is your favorite Actress? (ඔබේ ප්‍රියතම නිළිය
                  කවුරුද?){' '}
                  <span className='text-destructive'>*</span>
                </Label>
                <Select
                  name='favoriteActress'
                  required
                  value={formValues.favoriteActress}
                  onValueChange={(value) =>
                    handleValueChange('favoriteActress', value)
                  }
                  disabled={dataUnavailable}
                >
                  <SelectTrigger id='favoriteActress' className='w-full'>
                    <SelectValue placeholder='Select One' />
                  </SelectTrigger>
                  <SelectContent>
                    {actressOptions.map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.favoriteActress && (
                  <p className='text-destructive text-xs'>
                    {fieldErrors.favoriteActress}
                  </p>
                )}
              </div>
            </section>

            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' onClick={handleReset}>
                Reset
              </Button>
              <Button type='submit'>Save Survey</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/survey')({
  component: SurveyPage,
})
