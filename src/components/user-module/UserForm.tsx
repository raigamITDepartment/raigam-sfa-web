import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getAllSubRoles, getAllUserRoles } from '@/services/users/userApi'

export type UserFormMode = 'create' | 'edit'

const requiredNumber = (message: string) =>
  z
    .preprocess((value) => {
      if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed) return undefined
        return trimmed
      }
      return value
    }, z.coerce.number())
    .refine((val) => !Number.isNaN(val), {
      message,
    })

const userFormSchemaBase = z.object({
  userName: z.string().trim().min(1, 'Please enter user name'),
  firstName: z.string().min(1, 'Please enter first name'),
  lastName: z.string().min(1, 'Please enter last name'),
  email: z.string().min(1, 'Please enter email').email('Invalid email'),
  mobileNo: z.string().min(1, 'Please enter mobile number'),
  roleId: requiredNumber('Please select role'),
  subRoleId: requiredNumber('Please select sub role'),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
})

export type UserFormInput = z.input<typeof userFormSchemaBase>
export type UserFormValues = z.output<typeof userFormSchemaBase>

type UserFormProps = {
  mode: UserFormMode
  initialValues?: Partial<UserFormValues>
  onSubmit?: (values: UserFormValues) => void | Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

const buildUserSchema = (mode: UserFormMode) =>
  userFormSchemaBase.superRefine((values, ctx) => {
    const password = values.password?.trim() ?? ''
    const confirm = values.confirmPassword?.trim() ?? ''

    if (mode === 'create') {
      if (!password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter password',
          path: ['password'],
        })
      }
      if (!confirm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please confirm password',
          path: ['confirmPassword'],
        })
      }
    }

    if (password || confirm) {
      if (password.length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Password must be at least 6 characters',
          path: ['password'],
        })
      }
      if (password !== confirm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Passwords do not match',
          path: ['confirmPassword'],
        })
      }
    }
  })

const getDefaultValues = (
  initialValues?: Partial<UserFormValues>
): UserFormInput => ({
  userName: initialValues?.userName ?? '',
  firstName: initialValues?.firstName ?? '',
  lastName: initialValues?.lastName ?? '',
  email: initialValues?.email ?? '',
  mobileNo: initialValues?.mobileNo ?? '',
  roleId:
    initialValues?.roleId !== undefined && initialValues?.roleId !== null
      ? String(initialValues.roleId)
      : '',
  subRoleId:
    initialValues?.subRoleId !== undefined && initialValues?.subRoleId !== null
      ? String(initialValues.subRoleId)
      : '',
  password: initialValues?.password ?? '',
  confirmPassword: initialValues?.confirmPassword ?? '',
})

const toSelectValue = (value: unknown) =>
  value === null || value === undefined ? '' : String(value)

export function UserForm(props: UserFormProps) {
  const { mode, initialValues, onSubmit, onCancel, submitLabel } = props
  const schema = useMemo(() => buildUserSchema(mode), [mode])

  const { data: rolesData = [] } = useQuery({
    queryKey: ['user-roles', 'options'],
    queryFn: async () => {
      const res = await getAllUserRoles()
      return res.payload
    },
  })

  const { data: subRolesData = [] } = useQuery({
    queryKey: ['user-sub-roles', 'options'],
    queryFn: async () => {
      const res = await getAllSubRoles()
      return res.payload
    },
  })

  const roleOptions = useMemo(
    () =>
      rolesData
        .slice()
        .sort((a, b) => Number(a.id) - Number(b.id))
        .map((role) => ({
          label: role.roleName,
          value: String(role.id),
        })),
    [rolesData]
  )

  const subRoleOptions = useMemo(
    () =>
      subRolesData
        .slice()
        .sort((a, b) => Number(a.id) - Number(b.id))
        .map((subRole) => ({
          label: subRole.subRoleName,
          value: String(subRole.id),
        })),
    [subRolesData]
  )

  const form = useForm<UserFormInput, any, UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(initialValues),
  })

  useEffect(() => {
    form.reset(getDefaultValues(initialValues))
  }, [form, initialValues])

  const isSubmitting = form.formState.isSubmitting
  const buttonLabel =
    submitLabel ?? (mode === 'create' ? 'Add User' : 'Update User')

  const handleSubmit = async (values: UserFormValues) => {
    const normalized: UserFormValues = {
      ...values,
      password: values.password?.trim() || undefined,
      confirmPassword: values.confirmPassword?.trim() || undefined,
    }
    await onSubmit?.(normalized)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
        <FormField
          control={form.control}
          name='userName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>User name</FormLabel>
              <FormControl>
                <Input placeholder='User name' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='firstName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input placeholder='First Name' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='lastName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                <Input placeholder='Last Name' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type='email' placeholder='Email' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='mobileNo'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mobile Number</FormLabel>
              <FormControl>
                <Input placeholder='Mobile Number' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {mode === 'edit' ? (
          <div className='grid gap-4 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='roleId'
              render={({ field }) => (
                <FormItem>
                <FormLabel>Role</FormLabel>
                <Select
                  value={toSelectValue(field.value)}
                  onValueChange={field.onChange}
                  disabled={!roleOptions.length}
                >
                  <FormControl>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select role' />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='subRoleId'
              render={({ field }) => (
                <FormItem>
                <FormLabel>Sub Role</FormLabel>
                <Select
                  value={toSelectValue(field.value)}
                  onValueChange={field.onChange}
                  disabled={!subRoleOptions.length}
                >
                  <FormControl>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select sub role' />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subRoleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : (
          <>
            <FormField
              control={form.control}
              name='roleId'
              render={({ field }) => (
                <FormItem>
                <FormLabel>Role</FormLabel>
                <Select
                  value={toSelectValue(field.value)}
                  onValueChange={field.onChange}
                  disabled={!roleOptions.length}
                >
                  <FormControl>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select role' />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='subRoleId'
              render={({ field }) => (
                <FormItem>
                <FormLabel>Sub Role</FormLabel>
                <Select
                  value={toSelectValue(field.value)}
                  onValueChange={field.onChange}
                  disabled={!subRoleOptions.length}
                >
                  <FormControl>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select sub role' />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subRoleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type='password' placeholder='Password' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  type='password'
                  placeholder='Confirm Password'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className='flex flex-wrap items-center justify-end gap-2'>
          {onCancel ? (
            <Button
              type='button'
              variant='outline'
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          ) : null}
          <Button type='submit' disabled={isSubmitting}>
            {buttonLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
