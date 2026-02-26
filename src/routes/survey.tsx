import { useMemo } from 'react'
import { createFileRoute, useLocation } from '@tanstack/react-router'
import { GeneratedSurveyForm } from '@/components/survey/generated-survey-form'

const DEFAULT_FORM_FILE = 'people_s_award_2025.json'

function SurveyRoutePage() {
  const locationHref = useLocation({ select: (location) => location.href })
  const selectedFormFile = useMemo(() => {
    const queryIndex = locationHref.indexOf('?')
    const queryString = queryIndex >= 0 ? locationHref.slice(queryIndex) : ''
    const params = new URLSearchParams(queryString)
    return params.get('form')?.trim() || DEFAULT_FORM_FILE
  }, [locationHref])

  return (
    <div className='from-background to-muted/30 flex min-h-svh items-center justify-center bg-gradient-to-b p-4 md:p-8'>
      <GeneratedSurveyForm fileName={selectedFormFile} />
    </div>
  )
}

export const Route = createFileRoute('/survey')({
  component: SurveyRoutePage,
})
