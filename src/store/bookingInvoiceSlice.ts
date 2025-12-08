import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { BookingInvoiceFilters } from '@/types/invoice'

type BookingInvoiceState = {
  filters: BookingInvoiceFilters | null
}

const initialState: BookingInvoiceState = {
  filters: null,
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
  },
})

export const { setFilters, clearFilters } = bookingInvoiceSlice.actions
export default bookingInvoiceSlice.reducer
