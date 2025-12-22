import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableRow } from '@/components/ui/table'

type TableLoadingRowsProps = {
  columns: number
  rows?: number
}

export function TableLoadingRows({
  columns,
  rows = 8,
}: TableLoadingRowsProps) {
  const cols = Array.from({ length: Math.max(columns, 1) })
  const rowsList = Array.from({ length: Math.max(rows, 1) })

  return (
    <>
      {rowsList.map((_, rowIdx) => (
        <TableRow key={`loading-row-${rowIdx}`}>
          {cols.map((_, colIdx) => (
            <TableCell key={`loading-cell-${rowIdx}-${colIdx}`}>
              <Skeleton className='h-4 w-full rounded-sm' />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
