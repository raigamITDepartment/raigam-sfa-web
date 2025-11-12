import { Toaster as Sonner, ToasterProps } from 'sonner'
import { useTheme } from '@/context/theme-provider'

export function Toaster({ richColors = true, ...props }: ToasterProps) {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      richColors={richColors}
      position='top-right'
      className='toaster group [&_div[data-content]]:w-full'
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          // Success
          '--success-bg': 'rgb(240 253 244)', // bg-green-50
          '--success-border': 'rgb(34 197 94)', // border-green-500
          '--success-text': 'rgb(21 128 61)', // text-green-700
          // Error
          '--error-bg': 'rgb(254 242 242)', // bg-red-50
          '--error-border': 'rgb(239 68 68)', // border-red-500
          '--error-text': 'rgb(185 28 28)', // text-red-700
          // Warning
          '--warning-bg': 'rgb(254 252 232)', // bg-yellow-50
          '--warning-border': 'rgb(234 179 8)', // border-yellow-500
          '--warning-text': 'rgb(161 98 7)', // text-yellow-700
          // Information
          '--info-bg': 'rgb(239 246 255)', // bg-blue-50
          '--info-border': 'rgb(59 130 246)', // border-blue-500
          '--info-text': 'rgb(29 78 216)', // text-blue-700
        } as React.CSSProperties
      }
      {...props}
    />
  )
}
