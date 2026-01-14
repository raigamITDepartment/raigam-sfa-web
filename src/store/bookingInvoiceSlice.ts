import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { BookingInvoiceFilters } from '@/types/invoice'

type BookingInvoiceState = {
  filters: BookingInvoiceFilters | null
  actualFilters: BookingInvoiceFilters | null
  lateDeliveryFilters: BookingInvoiceFilters | null
  canceledFilters: BookingInvoiceFilters | null
}

const initialState: BookingInvoiceState = {
  filters: null,
  actualFilters: null,
  lateDeliveryFilters: null,
  canceledFilters: null,
}

const bookingInvoiceSlice = createSlice({
  name: 'bookingInvoice',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<BookingInvoiceFilters>) {
      state.filters = action.payload
    },
    clearFilters(state) {
      state.filters = null
    },
    setActualFilters(state, action: PayloadAction<BookingInvoiceFilters>) {
      state.actualFilters = action.payload
    },
    clearActualFilters(state) {
      state.actualFilters = null
    },
    setLateDeliveryFilters(
      state,
      action: PayloadAction<BookingInvoiceFilters>
    ) {
      state.lateDeliveryFilters = action.payload
    },
    clearLateDeliveryFilters(state) {
      state.lateDeliveryFilters = null
    },
    setCanceledFilters(
      state,
      action: PayloadAction<BookingInvoiceFilters>
    ) {
      state.canceledFilters = action.payload
    },
    clearCanceledFilters(state) {
      state.canceledFilters = null
    },
  },
})

export const {
  setFilters,
  clearFilters,
  setActualFilters,
  clearActualFilters,
  setLateDeliveryFilters,
  clearLateDeliveryFilters,
  setCanceledFilters,
  clearCanceledFilters,
} = bookingInvoiceSlice.actions
export default bookingInvoiceSlice.reducer
