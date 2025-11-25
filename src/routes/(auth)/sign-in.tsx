import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { SignIn } from '@/features/auth/sign-in'
import { getAccessToken, getRefreshToken } from '@/services/tokenService'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/sign-in')({
  beforeLoad: () => {
    const token = getAccessToken()
    const refresh = getRefreshToken()
    if (token || refresh) {
      throw redirect({
        to: '/dashboard/home-report',
        replace: true,
        search: true, // keep existing search or fall back to defaults
      })
    }
  },
  component: SignIn,
  validateSearch: searchSchema,
})
