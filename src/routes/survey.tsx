import { createFileRoute } from '@tanstack/react-router'
import { PeopleAward } from '@/components/survey/people-award'

function SurveyRoutePage() {
  return (
    <div className='from-background to-muted/30 flex min-h-svh items-center justify-center bg-gradient-to-b p-4 md:p-8'>
      <PeopleAward />
    </div>
  )
}

export const Route = createFileRoute('/survey')({
  component: SurveyRoutePage,
})
