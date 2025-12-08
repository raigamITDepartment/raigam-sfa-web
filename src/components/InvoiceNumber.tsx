import React from 'react'

interface InvoiceNumberProps {
  invoiceId: string
  className?: string
}

/**
 * InvoiceNumber component:
 * - Displays first two letters (prefix)
 * - Shows last 8 digits of numeric part (or more if exceeds 8 digits)
 * Example: CA000000000000028 → CA00000028
 */
const InvoiceNumber: React.FC<InvoiceNumberProps> = ({ invoiceId, className }) => {
  if (!invoiceId || invoiceId.length < 3) return <span>Invalid ID</span>

  // Extract prefix (first two letters)
  const prefix = invoiceId.slice(0, 2)

  // Extract numeric part
  const numericPart = invoiceId.slice(2)

  // Remove leading zeros safely
  const numericValue = numericPart.replace(/^0+/, '') || '0'

  // Determine how many digits to show (at least 8)
  const displayPart =
    numericValue.length > 8
      ? numericValue // show full if exceeds 8 digits
      : numericValue.padStart(8, '0') // pad to 8 digits

  const displayId = `${prefix}${displayPart}`

  return <span className={className}>{displayId}</span>
}

export default InvoiceNumber
