import { createFileRoute } from '@tanstack/react-router'
import { PeoplesAwardSurvey } from '@/components/survey/peoples-award-survey'

function SurveyRoutePage() {
  return (
    <div className='from-background to-muted/30 flex min-h-svh items-center justify-center bg-gradient-to-b p-4 md:p-8'>
      <PeoplesAwardSurvey />
    </div>
  )
}

export const Route = createFileRoute('/survey')({
  component: SurveyRoutePage,
})
