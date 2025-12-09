import React from 'react'

interface InvoiceNumberProps {
  invoiceId: string
  className?: string
}

export const formatInvoiceNumber = (invoiceId?: string) => {
  if (!invoiceId || invoiceId.length < 3) return 'Invalid ID'

  const prefix = invoiceId.slice(0, 2)
  const numericPart = invoiceId.slice(2)
  const numericValue = numericPart.replace(/^0+/, '') || '0'
  const displayPart =
    numericValue.length > 8 ? numericValue : numericValue.padStart(8, '0')

  return `${prefix}${displayPart}`
}

/**
 * InvoiceNumber component:
 * - Displays first two letters (prefix)
 * - Shows last 8 digits of numeric part (or more if exceeds 8 digits)
 * Example: CA000000000000028 -> CA00000028
 */
const InvoiceNumber: React.FC<InvoiceNumberProps> = ({ invoiceId, className }) => {
  const displayId = formatInvoiceNumber(invoiceId)
  return <span className={className}>{displayId}</span>
}

export default InvoiceNumber
