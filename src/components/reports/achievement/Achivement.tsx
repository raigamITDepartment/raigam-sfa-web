import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Download, FileSpreadsheet } from 'lucide-react'
import { getAchievementData } from '@/services/reports/achievementApi'
import { buildAchievementReportFile } from '@/lib/achievement-report'
import { CommonAlert } from '@/components/common-alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import AchievementFilter, { type AchievementFilterValues } from './Filter'

export default function Achivement() {
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle')
  const [summary, setSummary] = useState<{
    recordCount: number
    filledCells: number
    sheetsUpdated: number
    skippedRecords: number
    templateName: string
    startDate?: string
    endDate?: string
  } | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadName, setDownloadName] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastFilters, setLastFilters] =
    useState<AchievementFilterValues | null>(null)
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)

  const clearDownload = useCallback(() => {
    setDownloadUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    setDownloadName('')
  }, [])

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  const handleGenerate = async (values: AchievementFilterValues) => {
    if (!values.dateRange.from || !values.dateRange.to) return

    setStatus('loading')
    setErrorMessage(null)
    setSummary(null)
    setGeneratedAt(null)
    setLastFilters(values)
    clearDownload()

    const startDate = format(values.dateRange.from, 'yyyy-MM-dd')
    const endDate = format(values.dateRange.to, 'yyyy-MM-dd')

    try {
      const response = await getAchievementData({
        subChannelId: values.subChannelId,
        rangeId: values.rangeId,
        areaId: values.areaId,
        startDate,
        endDate,
      })

      const { workbookArray, fileName, summary: reportSummary } =
        await buildAchievementReportFile({
          templateUrl: values.template,
          payload: response?.payload,
          startDate,
          endDate,
        })

      const blob = new Blob([workbookArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)

      setDownloadUrl(url)
      setDownloadName(fileName)
      setSummary(reportSummary)
      setGeneratedAt(new Date())
      setStatus('ready')
    } catch (error) {
      setStatus('error')
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to generate report.'
      )
    }
  }

  const handleReset = () => {
    setStatus('idle')
    setSummary(null)
    setErrorMessage(null)
    setLastFilters(null)
    setGeneratedAt(null)
    clearDownload()
  }

  const statusBadge = useMemo(() => {
    switch (status) {
      case 'loading':
        return { label: 'Generating', variant: 'outline' as const }
      case 'ready':
        return { label: 'Ready', variant: 'default' as const }
      case 'error':
        return { label: 'Failed', variant: 'destructive' as const }
      default:
        return { label: 'Awaiting', variant: 'secondary' as const }
    }
  }, [status])

  const templateLabel = useMemo(() => {
    if (!lastFilters?.template) return 'Not selected'
    const parts = lastFilters.template.split('/').filter(Boolean)
    const file = parts[parts.length - 1] ?? lastFilters.template
    return file.replace(/\.[^.]+$/, '')
  }, [lastFilters])

  const dateLabel = useMemo(() => {
    if (!lastFilters?.dateRange?.from || !lastFilters?.dateRange?.to) {
      return 'Not selected'
    }
    return `${format(lastFilters.dateRange.from, 'yyyy-MM-dd')} ~ ${format(
      lastFilters.dateRange.to,
      'yyyy-MM-dd'
    )}`
  }, [lastFilters])

  const metaLabel = useMemo(() => {
    if (!generatedAt) return 'No export generated yet.'
    return `Generated on ${format(generatedAt, 'yyyy-MM-dd HH:mm')}`
  }, [generatedAt])

  return (
    <div className='space-y-4'>
      <Card className='border-slate-200/80'>
        <CardHeader className='border-b bg-slate-50/70'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1'>
              <CardTitle className='text-base'>
                Report Filters & Template
              </CardTitle>
              <CardDescription>
                Choose scope, date range, and the Excel template to fill.
              </CardDescription>
            </div>
            <Badge variant={statusBadge.variant}>
              {statusBadge.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className='pt-4'>
          <AchievementFilter
            onGenerateReport={handleGenerate}
            onReset={handleReset}
          />
        </CardContent>
      </Card>

      <Card className='border-slate-200/80'>
        <CardHeader className='border-b bg-slate-50/70'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1'>
              <CardTitle className='text-base'>Report Output</CardTitle>
              <CardDescription>
                Review the latest export summary and download the filled file.
              </CardDescription>
            </div>
            <div className='flex items-center gap-2 text-xs text-muted-foreground'>
              <FileSpreadsheet className='size-4' aria-hidden='true' />
              <span>{metaLabel}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4 pt-4'>
          {status === 'idle' ? (
            <CommonAlert
              variant='info'
              title='Ready to generate'
              description='Select filters, then click Generate Report to fill the template.'
            />
          ) : null}
          {status === 'loading' ? (
            <CommonAlert
              variant='info'
              title='Generating report'
              description='Fetching data and filling the Excel template...'
            />
          ) : null}
          {status === 'error' ? (
            <CommonAlert
              variant='error'
              title='Generation failed'
              description={errorMessage ?? 'Please try again.'}
            />
          ) : null}
          {status === 'ready' ? (
            <CommonAlert
              variant={summary?.filledCells ? 'success' : 'warning'}
              title={
                summary?.filledCells
                  ? 'Report ready to download'
                  : 'No cells updated'
              }
              description={
                summary?.filledCells
                  ? 'Download the filled template or regenerate with different filters.'
                  : 'Template did not match any records. Verify the data and template layout.'
              }
            />
          ) : null}

          <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
            <div className='rounded-lg border border-slate-200/80 bg-slate-50/70 p-3'>
              <div className='text-xs text-muted-foreground'>Template</div>
              <div className='truncate text-sm font-semibold'>
                {templateLabel}
              </div>
            </div>
            <div className='rounded-lg border border-slate-200/80 bg-slate-50/70 p-3'>
              <div className='text-xs text-muted-foreground'>Date Range</div>
              <div className='truncate text-sm font-semibold'>{dateLabel}</div>
            </div>
            <div className='rounded-lg border border-slate-200/80 bg-slate-50/70 p-3'>
              <div className='text-xs text-muted-foreground'>Sheets Updated</div>
              <div className='text-sm font-semibold'>
                {summary?.sheetsUpdated ?? 0}
              </div>
            </div>
            <div className='rounded-lg border border-slate-200/80 bg-slate-50/70 p-3'>
              <div className='text-xs text-muted-foreground'>Cells Filled</div>
              <div className='text-sm font-semibold'>
                {summary?.filledCells ?? 0}
              </div>
            </div>
          </div>

          <div className='flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground'>
            <div className='flex flex-wrap items-center gap-4'>
              <span>
                Records: <span className='font-semibold text-slate-700'>{summary?.recordCount ?? 0}</span>
              </span>
              <span>
                Skipped: <span className='font-semibold text-slate-700'>{summary?.skippedRecords ?? 0}</span>
              </span>
            </div>
            <span className='hidden text-right text-[11px] text-muted-foreground sm:block'>
              {downloadName ? downloadName : 'Generated file will appear here.'}
            </span>
          </div>

          <Separator />

          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='text-sm text-muted-foreground'>
              {downloadUrl
                ? 'Download the filled template when ready.'
                : 'No file generated yet.'}
            </div>
            {downloadUrl ? (
              <Button asChild className='min-w-[200px]'>
                <a href={downloadUrl} download={downloadName}>
                  <Download className='size-4' aria-hidden='true' />
                  <span>Download Filled Template</span>
                </a>
              </Button>
            ) : (
              <Button className='min-w-[200px]' disabled>
                <Download className='size-4' aria-hidden='true' />
                <span>Download Filled Template</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
