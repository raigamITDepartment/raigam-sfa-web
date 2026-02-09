import { Telescope } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function ComingSoon() {
  return (
    <div className='h-[calc(100vh-220px)] w-full'>
      <Card className='h-full w-full'>
        <CardContent className='flex h-full flex-col items-center justify-center gap-2 text-center'>
          <Telescope size={72} />
          <h1 className='text-4xl leading-tight font-bold'>Coming Soon!</h1>
          <p className='text-muted-foreground'>
            This page has not been created yet. <br />
            Stay tuned though!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
