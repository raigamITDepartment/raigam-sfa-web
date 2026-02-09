import { useSearch } from '@tanstack/react-router'
import Logo from '@/assets/logo.png'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <Card className='gap-4'>
      <CardHeader>
        <div className='mb-8 flex items-center justify-center'>
          <img src={Logo} alt='Raigam SFA System' width={180} />
        </div>
        <CardTitle className='text-lg tracking-tight'>Sign in</CardTitle>
        <CardDescription>
          Enter your user name and password below to <br />
          log into your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UserAuthForm redirectTo={redirect} />
      </CardContent>
      <CardFooter></CardFooter>
    </Card>
  )
}
