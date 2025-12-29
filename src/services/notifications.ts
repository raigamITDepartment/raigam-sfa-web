import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import type { BookingInvoiceReportItem } from '@/types/invoice'
import { getFirebaseAuth, getFirebaseDb } from '@/services/firebase'

type ReverseRequestNotificationInput = {
  invoice: BookingInvoiceReportItem
  senderUserId: number
  recipientUserId?: number
  recipientSubRoleId?: number
  recipientUid?: string
}

type ReverseApprovalNotificationInput = {
  invoice: BookingInvoiceReportItem
  senderUserId: number
  recipientUserId?: number
  recipientSubRoleId?: number
  recipientUid?: string
  comment?: string
  message?: string
}

type ReverseCompletedNotificationInput = {
  invoice: BookingInvoiceReportItem
  senderUserId: number
  recipientUserId?: number
  recipientSubRoleId?: number
  recipientUid?: string
}

type BaseNotificationInput = {
  type: string
  title: string
  message: string
  invoice: BookingInvoiceReportItem
  senderUserId: number
  recipientUserId?: number
  recipientSubRoleId?: number
  recipientUid?: string
}

const sendNotification = async ({
  type,
  title,
  message,
  invoice,
  senderUserId,
  recipientUserId,
  recipientSubRoleId,
  recipientUid,
}: BaseNotificationInput) => {
  const db = getFirebaseDb()
  const senderUid = getFirebaseAuth().currentUser?.uid ?? null
  if (!senderUid) {
    throw new Error('Firebase user not signed in')
  }
  const invoiceId = invoice.id ?? invoice.invoiceNo
  const invoiceNo = invoice.invoiceNo ?? String(invoiceId)

  await addDoc(collection(db, 'notifications'), {
    type,
    status: 'UNREAD',
    title,
    message,
    invoiceId,
    invoiceNo,
    territoryId: invoice.territoryId ?? null,
    routeId: invoice.routeId ?? null,
    outletId: invoice.outletId ?? null,
    senderUserId,
    senderUid,
    recipientUserId: recipientUserId ?? null,
    recipientSubRoleId: recipientSubRoleId ?? null,
    recipientUid: recipientUid ?? null,
    createdAt: serverTimestamp(),
  })
}

export const sendReverseRequestNotification = async ({
  invoice,
  senderUserId,
  recipientUserId,
  recipientSubRoleId,
  recipientUid,
}: ReverseRequestNotificationInput) => {
  const title = 'Invoice Reverse Request'
  const invoiceId = invoice.id ?? invoice.invoiceNo
  const invoiceNo = invoice.invoiceNo ?? String(invoiceId)
  const message = `Reverse request for invoice ${invoiceNo}.`

  await sendNotification({
    type: 'INVOICE_REVERSE_REQUEST',
    title,
    message,
    invoice,
    senderUserId,
    recipientUserId,
    recipientSubRoleId,
    recipientUid,
  })
}

export const sendReverseApprovalNotification = async ({
  invoice,
  senderUserId,
  recipientUserId,
  recipientSubRoleId,
  recipientUid,
  comment,
  message,
}: ReverseApprovalNotificationInput) => {
  const title = 'Invoice Reverse Approved'
  const invoiceId = invoice.id ?? invoice.invoiceNo
  const invoiceNo = invoice.invoiceNo ?? String(invoiceId)
  const messageBase = message ?? `Reverse approved for invoice ${invoiceNo}.`
  const fullMessage = comment?.trim()
    ? `${messageBase} Comment: ${comment.trim()}`
    : messageBase

  await sendNotification({
    type: 'INVOICE_REVERSE_APPROVED',
    title,
    message: fullMessage,
    invoice,
    senderUserId,
    recipientUserId,
    recipientSubRoleId,
    recipientUid,
  })
}

export const sendReverseCompletedNotification = async ({
  invoice,
  senderUserId,
  recipientUserId,
  recipientSubRoleId,
  recipientUid,
}: ReverseCompletedNotificationInput) => {
  const title = 'Invoice Reverse Completed'
  const invoiceId = invoice.id ?? invoice.invoiceNo
  const invoiceNo = invoice.invoiceNo ?? String(invoiceId)
  const message = `Invoice ${invoiceNo} reversed successfully.`

  await sendNotification({
    type: 'INVOICE_REVERSE_COMPLETED',
    title,
    message,
    invoice,
    senderUserId,
    recipientUserId,
    recipientSubRoleId,
    recipientUid,
  })
}
