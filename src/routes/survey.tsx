import { useEffect } from 'react'
import { createFileRoute, useLocation } from '@tanstack/react-router'
import { saveSurveyData } from '@/services/survey/surveyAPI'
import {
  PeoplesAwardSurvey,
  type PeoplesAwardSurveySubmission,
} from '@/components/survey/peoples-award-survey'

function toNumber(value: string | undefined, fallback = 0): number {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toLooseNumber(value: string | undefined, fallback = 0): number {
  if (!value) return fallback
  const normalized = value.replace(/%/g, '').trim()
  const direct = Number(normalized)
  if (Number.isFinite(direct)) return direct

  const matched = normalized.match(/-?\d+(\.\d+)?/)
  if (!matched) return fallback
  const parsed = Number(matched[0])
  return Number.isFinite(parsed) ? parsed : fallback
}

function toNumberFromUnknown(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function firstValue(query: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = query[key]
    if (value) return value

    const matchedEntry = Object.entries(query).find(
      ([queryKey]) => queryKey.toLowerCase() === key.toLowerCase()
    )
    if (matchedEntry?.[1]) return matchedEntry[1]
  }
  return ''
}

function firstRecordValue(
  record: Record<string, unknown> | null,
  keys: string[]
): unknown {
  if (!record) return undefined

  for (const key of keys) {
    if (key in record) return record[key]

    const matchedEntry = Object.entries(record).find(
      ([recordKey]) => recordKey.toLowerCase() === key.toLowerCase()
    )
    if (matchedEntry) return matchedEntry[1]
  }

  return undefined
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
  }
}

async function handleSaveSurvey(submission: PeoplesAwardSurveySubmission) {
  const { queryParams, formValues, outletByIdData } = submission
  const { surveyDate, surveyTime } = toDateTimeParts()

  const outletRouteId = toNumberFromUnknown(
    firstRecordValue(outletByIdData, ['routeId', 'route_id', 'routeCode']),
    0
  )
  const outletAgencyCode = toNumberFromUnknown(
    firstRecordValue(outletByIdData, ['agencyCode', 'agency_id', 'agencyId']),
    0
  )
  const outletShopCode = toNumberFromUnknown(
    firstRecordValue(outletByIdData, [
      'shopCode',
      'shop_id',
      'id',
      'outletCode',
    ]),
    0
  )
  const outletRouteCode = toNumberFromUnknown(
    firstRecordValue(outletByIdData, ['routeCode', 'route_id', 'routeId']),
    0
  )
  const outletDealerCode = firstRecordValue(outletByIdData, [
    'dealerCode',
    'dealer_code',
  ])
  const outletLatitude = toNumberFromUnknown(
    firstRecordValue(outletByIdData, ['latitude', 'lat']),
    0
  )
  const outletLongitude = toNumberFromUnknown(
    firstRecordValue(outletByIdData, ['longitude', 'lng']),
    0
  )

  const routeId = toNumber(
    firstValue(queryParams, ['routeId', 'RouteId', 'routeCode', 'RouteCode']),
    outletRouteId || toNumber(formValues.route.replace(/\D+/g, ''), 1)
  )
  const outletId = toNumber(
    firstValue(queryParams, ['outletId', 'OutletId', 'shopCode', 'ShopCode']),
    outletShopCode || toNumber(formValues.outlet.replace(/\D+/g, ''), 1)
  )

  const answers = [
    formValues.ageGroup,
    formValues.gender,
    formValues.watchMethod,
    formValues.favoriteTeledrama,
    formValues.favoriteMediaProgram,
    formValues.favoriteNewsBulletin,
    formValues.favoriteTvChannel,
    formValues.favoriteActor,
    formValues.favoriteActress,
    firstValue(queryParams, ['outletName', 'OutletName']),
  ]

  const payload = {
    userId: toNumber(
      firstValue(queryParams, ['userId', 'UserId', 'userid', 'USERID', 'repId'])
    ),
    surveyId: 21,
    uniqueId:
      firstValue(queryParams, ['uniqueId', 'unique_id']) ||
      `SURV-${surveyDate.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`,
    auditUser:
      firstValue(queryParams, ['auditUser', 'repUserName', 'RepUserName']) ||
      'testCRep',
    latitude: toNumber(
      firstValue(queryParams, ['latitude', 'lat']),
      outletLatitude || 6.9271
    ),
    longitude: toNumber(
      firstValue(queryParams, ['longitude', 'lng']),
      outletLongitude || 79.8612
    ),
    battery: toLooseNumber(
      firstValue(queryParams, [
        'battery_level',
        'batteryLevel',
        'BatteryLevel',
        'battery',
      ]),
      0
    ),
    surveyDate,
    surveyTime,
    routeId,
    outletId,
    dealerCode:
      firstValue(queryParams, ['dealerCode', 'DealerCode']) ||
      (typeof outletDealerCode === 'string' ? outletDealerCode : ''),
    agencyCode: toNumber(
      firstValue(queryParams, ['agencyCode', 'AgencyCode']),
      outletAgencyCode || 0
    ),
    routeCode: toNumber(
      firstValue(queryParams, ['routeCode', 'RouteCode']),
      outletRouteCode || routeId
    ),
    shopCode: toNumber(
      firstValue(queryParams, ['shopCode', 'ShopCode']),
      outletShopCode || outletId
    ),
    question1: answers[0],
    question2: answers[1],
    question3: answers[2],
    question4: answers[3],
    question5: answers[4],
    question6: answers[5],
    question7: answers[6],
    question8: answers[7],
    question9: answers[8],
    question10: answers[9],
    isActive: true,
  }
  console.log(payload)
  await saveSurveyData(payload)
}

function SurveyRoutePage() {
  const locationHref = useLocation({ select: (location) => location.href })

  useEffect(() => {
    const queryIndex = locationHref.indexOf('?')
    const search = queryIndex >= 0 ? locationHref.slice(queryIndex + 1) : ''
    const queryParams = Object.fromEntries(
      new URLSearchParams(search).entries()
    )
    // eslint-disable-next-line no-console
    console.log('Survey URL query params:', queryParams)
  }, [locationHref])

  return (
    <div className='from-background to-muted/30 flex min-h-svh items-center justify-center bg-gradient-to-b p-4 md:p-8'>
      <PeoplesAwardSurvey onSaveSurvey={handleSaveSurvey} />
    </div>
  )
}

export const Route = createFileRoute('/survey')({
  component: SurveyRoutePage,
})
