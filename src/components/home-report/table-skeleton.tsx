import { Skeleton } from '@/components/ui/skeleton'

type TableSkeletonProps = {
  headerCols?: number
  rows?: number
  minTableWidthClass?: string
}

// A lightweight table-like skeleton to match the home report table look
export default function TableSkeleton({
  headerCols = 12,
  rows = 8,
  minTableWidthClass = 'min-w-[2400px]',
}: TableSkeletonProps) {
  const cols = Array.from({ length: headerCols })

  return (
    <div className='relative border-r border-l border-gray-200'>
      <div className={`w-full ${minTableWidthClass} overflow-hidden`}>
        {/* Header group */}
        <div className='sticky top-0 z-10 bg-gray-200'>
          {/* Month header band */}
          <div className='flex'>
            <Skeleton className='h-10 w-full rounded-none' />
          </div>
          {/* Separator */}
          <div className='border-t border-gray-300' />
          {/* Column headers */}
          <div className='flex'>
            {cols.map((_, i) => (
              <Skeleton
                key={i}
                className='h-9 w-40 rounded-none border border-gray-300'
              />
            ))}
          </div>
        </div>

        {/* Body rows */}
        <div>
          {Array.from({ length: rows }).map((_, rIdx) => (
            <div key={rIdx} className='flex'>
              {cols.map((_, cIdx) => (
                <Skeleton
                  key={cIdx}
                  className='h-8 w-40 rounded-none border border-gray-200'
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
