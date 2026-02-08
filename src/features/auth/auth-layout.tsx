type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='auth-shell'>
      <div className='container relative z-10 grid min-h-svh max-w-none items-center justify-center py-10'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-2 sm:w-[480px] sm:p-8'>
          {children}
        </div>
      </div>
    </div>
  )
}
