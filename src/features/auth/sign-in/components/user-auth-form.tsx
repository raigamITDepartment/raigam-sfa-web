import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { loginThunk } from '@/store/authSlice'
import { useAppDispatch } from '@/store/hooks'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
// import { IconFacebook, IconGithub } from '@/assets/brand-icons'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

const formSchema = z.object({
  username: z.string().min(1, 'Please enter your user name'),
  password: z
    .string()
    .min(1, 'Please enter your password')
    .min(1, 'Password must be at least 1 characters long'),
  remember: z.boolean().optional().default(false),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  // Use input/output generics to align with zodResolver transformation
  const form = useForm<
    z.input<typeof formSchema>,
    any,
    z.output<typeof formSchema>
  >({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
      remember: false,
    },
  })

  function onSubmit(data: z.output<typeof formSchema>) {
    setIsLoading(true)

    const promise = dispatch(
      loginThunk({
        userName: data.username,
        password: data.password,
        remember: data.remember,
      })
    ).unwrap()

    toast.promise(promise, {
      loading: 'Signing in...',
      success: (_result) => {
        const targetPath = redirectTo || '/dashboard/home-report'
        navigate({ to: targetPath, replace: true })
        return `Welcome back, ${data.username}!`
      },
      error: () => 'Invalid username or password',
    })

    promise.finally(() => setIsLoading(false))
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        autoComplete='on'
        {...props}
      >
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel>User Name</FormLabel>
              <FormControl>
                <Input
                  placeholder='User name'
                  autoComplete='username'
                  autoCapitalize='none'
                  autoCorrect='off'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder='********'
                  autoComplete='current-password'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='remember'
          render={({ field }) => (
            <FormItem className='mt-1 flex flex-row items-center space-x-2'>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(!!v)}
                />
              </FormControl>
              <FormLabel className='m-0'>Remember me</FormLabel>
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          Sign in
        </Button>
      </form>
    </Form>
  )
}
