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
import { MultiSelect } from '@/components/ui/multi-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SubRoleId } from '@/lib/authz'
import {
  type ApiResponse,
  type ChannelDTO,
  type SubChannelDTO,
  type RegionDTO,
  type AreaDTO,
  type AreaRegionDTO,
  type RangeDTO,
  type TerritoryDTO,
  type AgencyDTO,
  getAllChannel,
  getAllSubChannel,
  getAllRegion,
  getAllArea,
  getAllAreaRegions,
  getAllRange,
  getTerritoriesByAreaId,
  getAllAgency,
} from '@/services/userDemarcationApi'
import { getAllRoles, getAllUserGroups, getAllUserTypes } from '@/services/users/userApi'

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

const optionalNumber = () =>
  z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return undefined
      return trimmed
    }
    return value
  }, z.coerce.number().optional())

const userFormSchemaBase = z.object({
  userName: z.string().trim().min(1, 'Please enter user name'),
  firstName: z.string().min(1, 'Please enter first name'),
  lastName: z.string().min(1, 'Please enter last name'),
  email: z.string().min(1, 'Please enter email').email('Invalid email'),
  mobileNo: z.string().min(1, 'Please enter mobile number'),
  userGroupId: requiredNumber('Please select user group'),
  roleId: requiredNumber('Please select role'),
  userLevelId: requiredNumber('Please select access level'),
  channelId: optionalNumber(),
  subChannelId: optionalNumber(),
  regionId: optionalNumber(),
  areaId: optionalNumber(),
  areaIds: z.array(z.string()).optional(),
  rangeId: optionalNumber(),
  territoryId: optionalNumber(),
  agencyId: optionalNumber(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
})

export type UserFormValues = z.output<typeof userFormSchemaBase>
export type UserFormInput = UserFormValues

type UserFormProps = {
  mode: UserFormMode
  initialValues?: Partial<UserFormValues>
  onSubmit?: (values: UserFormValues) => void | Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

const hasNumberValue = (value: unknown) =>
  typeof value === 'number' && !Number.isNaN(value)

const buildUserSchema = (mode: UserFormMode) =>
  userFormSchemaBase.superRefine((values, ctx) => {
    const password = values.password?.trim() ?? ''
    const confirm = values.confirmPassword?.trim() ?? ''
    const roleId = values.roleId

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

    const isChannelHead = roleId === SubRoleId.ChannelHead
    const isSubChannelHead = roleId === SubRoleId.SubChannelHead
    const isRegionalManager = roleId === SubRoleId.RegionSalesManager
    const isAreaManager = roleId === SubRoleId.AreaSalesManager
    const isAreaExecutive = roleId === SubRoleId.AreaSalesExecutive
    const isRepresentative = roleId === SubRoleId.Representative
    const isAgent = roleId === SubRoleId.Agent

    const requiresChannel =
      isChannelHead ||
      isSubChannelHead ||
      isRegionalManager ||
      isAreaManager ||
      isAreaExecutive ||
      isRepresentative ||
      isAgent
    const requiresSubChannel =
      isSubChannelHead ||
      isRegionalManager ||
      isAreaManager ||
      isAreaExecutive ||
      isRepresentative ||
      isAgent
    const requiresRegion =
      isRegionalManager ||
      isAreaManager ||
      isAreaExecutive ||
      isRepresentative ||
      isAgent
    const requiresAreaMulti = isAreaManager
    const requiresAreaSingle =
      isAreaExecutive || isRepresentative || isAgent
    const requiresRange = isAreaExecutive || isRepresentative || isAgent
    const requiresTerritory = isRepresentative || isAgent
    const requiresAgency = isAgent

    if (requiresChannel && !hasNumberValue(values.channelId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select channel',
        path: ['channelId'],
      })
    }

    if (requiresSubChannel && !hasNumberValue(values.subChannelId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select sub channel',
        path: ['subChannelId'],
      })
    }

    if (requiresRegion && !hasNumberValue(values.regionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select region',
        path: ['regionId'],
      })
    }

    if (requiresAreaMulti) {
      const areaIds = values.areaIds ?? []
      if (!Array.isArray(areaIds) || areaIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please select at least one area',
          path: ['areaIds'],
        })
      }
    }

    if (requiresAreaSingle && !hasNumberValue(values.areaId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select area',
        path: ['areaId'],
      })
    }

    if (requiresRange && !hasNumberValue(values.rangeId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select range',
        path: ['rangeId'],
      })
    }

    if (requiresTerritory && !hasNumberValue(values.territoryId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select territory',
        path: ['territoryId'],
      })
    }

    if (requiresAgency && !hasNumberValue(values.agencyId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select agency',
        path: ['agencyId'],
      })
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
  }) as z.ZodType<UserFormValues, UserFormValues>

const getDefaultValues = (
  initialValues?: Partial<UserFormValues>
): Partial<UserFormValues> => ({
  userName: initialValues?.userName ?? '',
  firstName: initialValues?.firstName ?? '',
  lastName: initialValues?.lastName ?? '',
  email: initialValues?.email ?? '',
  mobileNo: initialValues?.mobileNo ?? '',
  userGroupId: initialValues?.userGroupId ?? undefined,
  roleId: initialValues?.roleId ?? undefined,
  userLevelId: initialValues?.userLevelId ?? undefined,
  channelId: initialValues?.channelId ?? undefined,
  subChannelId: initialValues?.subChannelId ?? undefined,
  regionId: initialValues?.regionId ?? undefined,
  areaId: initialValues?.areaId ?? undefined,
  areaIds: Array.isArray(initialValues?.areaIds)
    ? initialValues.areaIds
    : [],
  rangeId: initialValues?.rangeId ?? undefined,
  territoryId: initialValues?.territoryId ?? undefined,
  agencyId: initialValues?.agencyId ?? undefined,
  password: initialValues?.password ?? '',
  confirmPassword: initialValues?.confirmPassword ?? '',
})

const toSelectValue = (value: unknown) =>
  value === null || value === undefined ? '' : String(value)

const toNumberOrUndefined = (value: string) =>
  value ? Number(value) : undefined

const mergeById = <T,>(
  list: T[],
  extras: T[],
  getId: (item: T) => string
) => {
  const seen = new Set<string>()
  const result: T[] = []

  for (const item of extras) {
    const id = getId(item)
    if (!id || seen.has(id)) continue
    seen.add(id)
    result.push(item)
  }

  for (const item of list) {
    const id = getId(item)
    if (!id || seen.has(id)) continue
    seen.add(id)
    result.push(item)
  }

  return result
}

type SelectOption = {
  label: string
  value: string
}

const ensureSelectedOption = (
  options: SelectOption[],
  selectedValue: string,
  fallbackLabel: (value: string) => string
) => {
  if (!selectedValue) return options
  if (options.some((option) => option.value === selectedValue)) return options
  return [{ value: selectedValue, label: fallbackLabel(selectedValue) }, ...options]
}

const ensureSelectedOptions = (
  options: SelectOption[],
  selectedValues: string[],
  fallbackLabel: (value: string) => string
) => {
  if (!selectedValues.length) return options
  const seen = new Set(options.map((option) => option.value))
  const extras: SelectOption[] = []

  for (const rawValue of selectedValues) {
    const value = String(rawValue)
    if (!value || seen.has(value)) continue
    seen.add(value)
    extras.push({ value, label: fallbackLabel(value) })
  }

  return extras.length ? [...extras, ...options] : options
}

const optionsQueryDefaults = {
  staleTime: 1000 * 60 * 5,
  gcTime: 1000 * 60 * 30,
  refetchOnMount: (query: { state: { data: unknown } }) =>
    query.state.data === undefined,
  refetchOnWindowFocus: false,
}

export function UserForm(props: UserFormProps) {
  const { mode, initialValues, onSubmit, onCancel, submitLabel } = props
  const schema = useMemo(() => buildUserSchema(mode), [mode])

  const { data: rolesData = [] } = useQuery({
    queryKey: ['user-groups', 'options'],
    queryFn: async () => {
      const res = await getAllUserGroups()
      return res.payload
    },
    ...optionsQueryDefaults,
  })

  const { data: subRolesData = [] } = useQuery({
    queryKey: ['user-roles', 'options'],
    queryFn: async () => {
      const res = await getAllRoles()
      return res.payload
    },
    ...optionsQueryDefaults,
  })

  const { data: userTypesData = [] } = useQuery({
    queryKey: ['user-types', 'options'],
    queryFn: async () => {
      const res = await getAllUserTypes()
      return res.payload
    },
    ...optionsQueryDefaults,
  })

  const { data: channelsData = [] } = useQuery({
    queryKey: ['channels', 'options'],
    queryFn: async () => {
      const res = (await getAllChannel()) as ApiResponse<ChannelDTO[]>
      return res.payload
    },
    ...optionsQueryDefaults,
  })

  const { data: subChannelsData = [] } = useQuery({
    queryKey: ['sub-channels', 'options'],
    queryFn: async () => {
      const res = (await getAllSubChannel()) as ApiResponse<SubChannelDTO[]>
      return res.payload
    },
    ...optionsQueryDefaults,
  })

  const { data: regionsData = [] } = useQuery({
    queryKey: ['regions', 'options'],
    queryFn: async () => {
      const res = (await getAllRegion()) as ApiResponse<RegionDTO[]>
      return res.payload
    },
    ...optionsQueryDefaults,
  })

  const { data: areasData = [] } = useQuery({
    queryKey: ['areas', 'options'],
    queryFn: async () => {
      const res = (await getAllArea()) as ApiResponse<AreaDTO[]>
      return res.payload
    },
    ...optionsQueryDefaults,
  })

  const { data: areaRegionsData = [] } = useQuery({
    queryKey: ['area-region-mappings', 'options'],
    queryFn: async () => {
      const res = (await getAllAreaRegions()) as ApiResponse<AreaRegionDTO[]>
      return res.payload
    },
    ...optionsQueryDefaults,
  })

  const { data: rangesData = [] } = useQuery({
    queryKey: ['ranges', 'options'],
    queryFn: async () => {
      const res = (await getAllRange()) as ApiResponse<RangeDTO[]>
      return res.payload
    },
    ...optionsQueryDefaults,
  })

  const { data: agenciesData = [] } = useQuery({
    queryKey: ['agencies', 'options'],
    queryFn: async () => {
      const res = (await getAllAgency()) as ApiResponse<AgencyDTO[]>
      return res.payload
    },
    ...optionsQueryDefaults,
  })

  const roleOptions = useMemo(
    () =>
      rolesData
        .slice()
        .sort((a, b) => Number(a.id) - Number(b.id))
        .map((role) => ({
          label: role.userGroupName ?? role.roleName ?? '-',
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
          label: subRole.roleName ?? subRole.subRoleName ?? '-',
          value: String(subRole.id),
        })),
    [subRolesData]
  )

  const accessLevelOptions = useMemo(
    () =>
      userTypesData
        .slice()
        .sort((a, b) => Number(a.id) - Number(b.id))
        .map((userType) => ({
          label: userType.userTypeName ?? '-',
          value: String(userType.id),
        })),
    [userTypesData]
  )

  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(initialValues),
  })

  useEffect(() => {
    form.reset(getDefaultValues(initialValues))
  }, [form, initialValues])

  const selectedRoleValue = form.watch('roleId')
  const selectedRoleId = useMemo(() => {
    if (selectedRoleValue === undefined || selectedRoleValue === null) {
      return undefined
    }
    const raw = String(selectedRoleValue).trim()
    if (!raw) return undefined
    const parsed = Number(raw)
    return Number.isNaN(parsed) ? undefined : parsed
  }, [selectedRoleValue])
  const selectedRoleLabel = useMemo(() => {
    if (selectedRoleValue === undefined || selectedRoleValue === null) return ''
    const lookup = String(selectedRoleValue)
    return subRoleOptions.find((option) => option.value === lookup)?.label ?? ''
  }, [selectedRoleValue, subRoleOptions])
  const normalizedRoleLabel = selectedRoleLabel
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
  const hasRoleWord = (word: string) =>
    new RegExp(`\\b${word}\\b`, 'i').test(normalizedRoleLabel)
  const hasRolePhrase = (phrase: string) =>
    normalizedRoleLabel.includes(phrase)
  const isExecutiveSalesLabel =
    normalizedRoleLabel === 'executive sales' ||
    normalizedRoleLabel === 'sales executive' ||
    normalizedRoleLabel === 'area sales executive'

  const isChannelHead =
    selectedRoleId === SubRoleId.ChannelHead || hasRolePhrase('channel head')
  const isSubChannelHead =
    selectedRoleId === SubRoleId.SubChannelHead ||
    hasRolePhrase('sub channel head')
  const isRegionalManager =
    selectedRoleId === SubRoleId.RegionSalesManager ||
    hasRolePhrase('regional sales manager') ||
    hasRolePhrase('region sales manager')
  const isAreaManager =
    selectedRoleId === SubRoleId.AreaSalesManager ||
    hasRolePhrase('area sales manager')
  const isAreaExecutive =
    selectedRoleId === SubRoleId.AreaSalesExecutive || isExecutiveSalesLabel
  const isRepresentative =
    selectedRoleId === SubRoleId.Representative ||
    hasRoleWord('representative') ||
    hasRoleWord('rep')
  const isAgent =
    selectedRoleId === SubRoleId.Agent || hasRoleWord('agent')

  const requiresChannel =
    isChannelHead ||
    isSubChannelHead ||
    isRegionalManager ||
    isAreaManager ||
    isAreaExecutive ||
    isRepresentative ||
    isAgent
  const requiresSubChannel =
    isSubChannelHead ||
    isRegionalManager ||
    isAreaManager ||
    isAreaExecutive ||
    isRepresentative ||
    isAgent
  const requiresRegion =
    isRegionalManager ||
    isAreaManager ||
    isAreaExecutive ||
    isRepresentative ||
    isAgent
  const requiresAreaMulti = isAreaManager
  const requiresAreaSingle = isAreaExecutive || isRepresentative || isAgent
  const requiresRange = isAreaExecutive || isRepresentative || isAgent
  const requiresTerritory = isRepresentative || isAgent
  const requiresAgency = isAgent

  const channelValue = toSelectValue(form.watch('channelId'))
  const subChannelValue = toSelectValue(form.watch('subChannelId'))
  const regionValue = toSelectValue(form.watch('regionId'))
  const areaValue = toSelectValue(form.watch('areaId'))
  const rawAreaIdsValue = form.watch('areaIds') ?? []
  const areaIdsValue = Array.isArray(rawAreaIdsValue)
    ? rawAreaIdsValue.map((value) => String(value)).filter(Boolean)
    : []
  const rangeValue = toSelectValue(form.watch('rangeId'))
  const territoryValue = toSelectValue(form.watch('territoryId'))
  const agencyValue = toSelectValue(form.watch('agencyId'))
  const userGroupValue = toSelectValue(form.watch('userGroupId'))
  const roleValue = toSelectValue(selectedRoleValue)
  const userLevelValue = toSelectValue(form.watch('userLevelId'))

  const { data: territoriesData = [] } = useQuery({
    queryKey: ['territories', 'by-area', areaValue || 'none'],
    queryFn: async () => {
      if (!areaValue) return []
      const res = (await getTerritoriesByAreaId(
        Number(areaValue)
      )) as ApiResponse<TerritoryDTO[]>
      return res.payload
    },
    enabled: Boolean(areaValue),
    ...optionsQueryDefaults,
  })

  const showChannel =
    requiresChannel || (mode === 'edit' && Boolean(channelValue))
  const showSubChannel =
    requiresSubChannel || (mode === 'edit' && Boolean(subChannelValue))
  const showRegion =
    requiresRegion || (mode === 'edit' && Boolean(regionValue))
  const showAreaMulti =
    requiresAreaMulti ||
    (mode === 'edit' && Array.isArray(areaIdsValue) && areaIdsValue.length > 0)
  const showAreaSingle =
    (requiresAreaSingle || (mode === 'edit' && Boolean(areaValue))) &&
    !showAreaMulti
  const showRange =
    (requiresRange || (mode === 'edit' && Boolean(rangeValue))) &&
    !isRegionalManager &&
    !isAreaManager
  const showTerritory =
    requiresTerritory || (mode === 'edit' && Boolean(territoryValue))
  const showAgency =
    requiresAgency || (mode === 'edit' && Boolean(agencyValue))

  const filteredSubChannels = useMemo(() => {
    if (!subChannelsData.length) return []
    if (!channelValue) return subChannelsData
    const base = subChannelsData.filter(
      (item) => String(item.channelId ?? '') === channelValue
    )
    if (
      subChannelValue &&
      !base.some((item) => String(item.id) === subChannelValue)
    ) {
      const selected = subChannelsData.find(
        (item) => String(item.id) === subChannelValue
      )
      if (selected) return mergeById(base, [selected], (item) => String(item.id))
    }
    return base
  }, [subChannelsData, channelValue, subChannelValue])

  const filteredRegions = useMemo(() => {
    if (!regionsData.length) return []
    let base = regionsData
    if (subChannelValue) {
      base = regionsData.filter(
        (region) => String(region.subChannelId ?? '') === subChannelValue
      )
    } else if (channelValue) {
      base = regionsData.filter(
        (region) => String(region.channelId ?? '') === channelValue
      )
    }

    if (
      regionValue &&
      !base.some((region) => String(region.id) === regionValue)
    ) {
      const selected = regionsData.find(
        (region) => String(region.id) === regionValue
      )
      if (selected) return mergeById(base, [selected], (item) => String(item.id))
    }
    return base
  }, [regionsData, subChannelValue, channelValue, regionValue])

  const filteredAreas = useMemo(() => {
    if (!areasData.length) return []
    if (!regionValue) {
      const selectedAreas = areasData.filter((area) => {
        const id = String(area.id)
        return (
          (areaValue && id === areaValue) ||
          areaIdsValue.includes(id)
        )
      })
      return selectedAreas.length
        ? mergeById(areasData, selectedAreas, (area) => String(area.id))
        : areasData
    }
    if (!areaRegionsData.length) return areasData
    const allowedAreaIds = new Set(
      areaRegionsData
        .filter(
          (mapping) =>
            String(mapping.regionId ?? '') === regionValue &&
            mapping.areaId !== undefined &&
            mapping.areaId !== null
        )
        .map((mapping) => String(mapping.areaId))
    )
    if (!allowedAreaIds.size) {
      const selectedAreas = areasData.filter((area) => {
        const id = String(area.id)
        return (
          (areaValue && id === areaValue) ||
          areaIdsValue.includes(id)
        )
      })
      return selectedAreas
    }
    const base = areasData.filter((area) =>
      allowedAreaIds.has(String(area.id))
    )
    const selectedAreas = areasData.filter((area) => {
      const id = String(area.id)
      return (
        (areaValue && id === areaValue) ||
        areaIdsValue.includes(id)
      )
    })
    return selectedAreas.length
      ? mergeById(base, selectedAreas, (area) => String(area.id))
      : base
  }, [areasData, areaRegionsData, regionValue, areaValue, areaIdsValue])

  const filteredRanges = useMemo(() => {
    if (!rangesData.length) return []
    if (!subChannelValue) return rangesData
    const map: Record<number, number[]> = {
      1: [1, 3],
      2: [2, 3],
      3: [4],
      4: [6],
      5: [7],
      6: [9],
      7: [8],
    }
    const allowed = map[Number(subChannelValue)]
    if (!allowed) return rangesData
    const base = rangesData.filter((rangeItem) => {
      const optionId = rangeItem.id ?? rangeItem.rangeId
      if (optionId === undefined || optionId === null) return false
      return allowed.includes(Number(optionId))
    })
    if (
      rangeValue &&
      !base.some(
        (rangeItem) =>
          String(rangeItem.id ?? rangeItem.rangeId ?? '') === rangeValue
      )
    ) {
      const selected = rangesData.find(
        (rangeItem) =>
          String(rangeItem.id ?? rangeItem.rangeId ?? '') === rangeValue
      )
      if (selected)
        return mergeById(
          base,
          [selected],
          (item) => String(item.id ?? item.rangeId ?? '')
        )
    }
    return base
  }, [rangesData, subChannelValue, rangeValue])

  const filteredTerritories = useMemo(() => {
    if (!territoriesData.length) return []
    let filtered = territoriesData.slice()
    const hasChannelField = filtered.some((item) => item.channelId != null)
    const hasSubChannelField = filtered.some((item) => item.subChannelId != null)
    const hasRangeField = filtered.some((item) => item.rangeId != null)
    if (channelValue && hasChannelField) {
      filtered = filtered.filter(
        (item) => String(item.channelId ?? '') === channelValue
      )
    }
    if (subChannelValue && hasSubChannelField) {
      filtered = filtered.filter(
        (item) => String(item.subChannelId ?? '') === subChannelValue
      )
    }
    if (rangeValue && hasRangeField) {
      filtered = filtered.filter(
        (item) => String(item.rangeId ?? '') === rangeValue
      )
    }
    if (
      territoryValue &&
      !filtered.some((item) => String(item.id) === territoryValue)
    ) {
      const selected = territoriesData.find(
        (item) => String(item.id) === territoryValue
      )
      if (selected)
        return mergeById(filtered, [selected], (item) => String(item.id))
    }
    return filtered
  }, [
    territoriesData,
    channelValue,
    subChannelValue,
    areaValue,
    rangeValue,
    territoryValue,
  ])

  const filteredAgencies = useMemo(() => {
    if (!agenciesData.length) return []
    let filtered = agenciesData.slice()
    const hasChannelField = filtered.some((item) => item.channelId != null)
    const hasSubChannelField = filtered.some((item) => item.subChannelId != null)
    const hasRangeField = filtered.some((item) => item.rangeId != null)
    const hasTerritoryField = filtered.some((item) => item.territoryId != null)
    if (channelValue && hasChannelField) {
      filtered = filtered.filter(
        (item) => String(item.channelId ?? '') === channelValue
      )
    }
    if (subChannelValue && hasSubChannelField) {
      filtered = filtered.filter(
        (item) => String(item.subChannelId ?? '') === subChannelValue
      )
    }
    if (rangeValue && hasRangeField) {
      filtered = filtered.filter(
        (item) => String(item.rangeId ?? '') === rangeValue
      )
    }
    if (territoryValue && hasTerritoryField) {
      filtered = filtered.filter(
        (item) => String(item.territoryId ?? '') === territoryValue
      )
    }
    if (
      agencyValue &&
      !filtered.some((item) => String(item.id) === agencyValue)
    ) {
      const selected = agenciesData.find(
        (item) => String(item.id) === agencyValue
      )
      if (selected)
        return mergeById(filtered, [selected], (item) => String(item.id))
    }
    return filtered
  }, [
    agenciesData,
    channelValue,
    subChannelValue,
    rangeValue,
    territoryValue,
    agencyValue,
  ])

  const userGroupOptions = useMemo(
    () =>
      ensureSelectedOption(
        roleOptions,
        userGroupValue,
        (value) => `User Group ${value}`
      ),
    [roleOptions, userGroupValue]
  )

  const roleOptionsWithSelected = useMemo(
    () =>
      ensureSelectedOption(
        subRoleOptions,
        roleValue,
        (value) => `Role ${value}`
      ),
    [subRoleOptions, roleValue]
  )

  const accessLevelOptionsWithSelected = useMemo(
    () =>
      ensureSelectedOption(
        accessLevelOptions,
        userLevelValue,
        (value) => `Access Level ${value}`
      ),
    [accessLevelOptions, userLevelValue]
  )

  const channelOptions = useMemo(
    () =>
      ensureSelectedOption(
        channelsData.map((channel) => ({
          label:
            channel.channelName ??
            channel.channelCode ??
            `Channel ${channel.id}`,
          value: String(channel.id),
        })),
        channelValue,
        (value) => `Channel ${value}`
      ),
    [channelsData, channelValue]
  )

  const subChannelOptions = useMemo(
    () =>
      ensureSelectedOption(
        filteredSubChannels.map((subChannel) => ({
          label:
            subChannel.subChannelName ??
            subChannel.subChannelCode ??
            `Sub Channel ${subChannel.id}`,
          value: String(subChannel.id),
        })),
        subChannelValue,
        (value) => `Sub Channel ${value}`
      ),
    [filteredSubChannels, subChannelValue]
  )

  const regionOptions = useMemo(
    () =>
      ensureSelectedOption(
        filteredRegions.map((region) => ({
          label: region.regionName ?? region.name ?? `Region ${region.id}`,
          value: String(region.id),
        })),
        regionValue,
        (value) => `Region ${value}`
      ),
    [filteredRegions, regionValue]
  )

  const areaMultiOptions = useMemo(
    () =>
      ensureSelectedOptions(
        filteredAreas.map((area) => ({
          label: area.areaName ?? `Area ${area.id}`,
          value: String(area.id),
        })),
        areaIdsValue,
        (value) => `Area ${value}`
      ),
    [filteredAreas, areaIdsValue]
  )

  const areaSingleOptions = useMemo(
    () =>
      ensureSelectedOption(
        filteredAreas.map((area) => ({
          label: area.areaName ?? `Area ${area.id}`,
          value: String(area.id),
        })),
        areaValue,
        (value) => `Area ${value}`
      ),
    [filteredAreas, areaValue]
  )

  const rangeOptions = useMemo(
    () =>
      ensureSelectedOption(
        filteredRanges
          .map((rangeItem) => {
            const optionId = rangeItem.id ?? rangeItem.rangeId
            if (optionId === undefined || optionId === null) return null
            return {
              label: rangeItem.rangeName ?? `Range ${optionId}`,
              value: String(optionId),
            }
          })
          .filter((option): option is SelectOption => Boolean(option)),
        rangeValue,
        (value) => `Range ${value}`
      ),
    [filteredRanges, rangeValue]
  )

  const territoryOptions = useMemo(
    () =>
      ensureSelectedOption(
        filteredTerritories.map((territory) => ({
          label:
            territory.territoryName ??
            territory.name ??
            `Territory ${territory.id}`,
          value: String(territory.id),
        })),
        territoryValue,
        (value) => `Territory ${value}`
      ),
    [filteredTerritories, territoryValue]
  )

  const agencyOptions = useMemo(
    () =>
      ensureSelectedOption(
        filteredAgencies.map((agency) => ({
          label:
            agency.agencyName ??
            agency.agencyCode?.toString() ??
            `Agency ${agency.id}`,
          value: String(agency.id),
        })),
        agencyValue,
        (value) => `Agency ${value}`
      ),
    [filteredAgencies, agencyValue]
  )

  const isSubmitting = form.formState.isSubmitting
  const buttonLabel =
    submitLabel ?? (mode === 'create' ? 'Add User' : 'Update User')

  const handleSubmit = async (values: UserFormValues) => {
    const normalized: UserFormValues = {
      ...values,
      password: values.password?.trim() || undefined,
      confirmPassword: values.confirmPassword?.trim() || undefined,
      channelId: requiresChannel ? values.channelId : undefined,
      subChannelId: requiresSubChannel ? values.subChannelId : undefined,
      regionId: requiresRegion ? values.regionId : undefined,
      areaIds: requiresAreaMulti ? values.areaIds : undefined,
      areaId: requiresAreaSingle ? values.areaId : undefined,
      rangeId: requiresRange ? values.rangeId : undefined,
      territoryId: requiresTerritory ? values.territoryId : undefined,
      agencyId: requiresAgency ? values.agencyId : undefined,
    }
    await onSubmit?.(normalized)
  }

  const userGroupField = (
    <FormField
      control={form.control}
      name='userGroupId'
      render={({ field }) => (
        <FormItem>
          <FormLabel>User Group</FormLabel>
          <Select
            value={toSelectValue(field.value)}
            onValueChange={(value) =>
              field.onChange(toNumberOrUndefined(value))
            }
            disabled={!roleOptions.length}
          >
            <FormControl>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select user group' />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {userGroupOptions.map((option, index) => (
                <SelectItem key={`${option.value}-${index}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const roleField = (
    <FormField
      control={form.control}
      name='roleId'
      render={({ field }) => (
        <FormItem>
          <FormLabel>Role</FormLabel>
          <Select
            value={toSelectValue(field.value)}
            onValueChange={(value) =>
              field.onChange(toNumberOrUndefined(value))
            }
            disabled={!subRoleOptions.length}
          >
            <FormControl>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select role' />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {roleOptionsWithSelected.map((option, index) => (
                <SelectItem key={`${option.value}-${index}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )

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
            {userGroupField}
            {roleField}
          </div>
        ) : (
          <>
            {userGroupField}
            {roleField}
          </>
        )}
        <div className='grid gap-4 sm:grid-cols-2'>
          {showChannel ? (
            <FormField
              control={form.control}
              name='channelId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Channel</FormLabel>
                <Select
                  value={toSelectValue(field.value)}
                  onValueChange={(value) => {
                    field.onChange(toNumberOrUndefined(value))
                    form.setValue('subChannelId', undefined)
                    form.setValue('regionId', undefined)
                    form.setValue('areaId', undefined)
                    form.setValue('areaIds', [])
                    form.setValue('rangeId', undefined)
                    form.setValue('territoryId', undefined)
                    form.setValue('agencyId', undefined)
                  }}
                  disabled={!channelsData.length}
                >
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select Channel' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {channelOptions.map((channel, index) => (
                        <SelectItem
                          key={`${channel.value}-${index}`}
                          value={channel.value}
                        >
                          {channel.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          {showSubChannel ? (
            <FormField
              control={form.control}
              name='subChannelId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Sub Channel</FormLabel>
                <Select
                  value={toSelectValue(field.value)}
                  onValueChange={(value) => {
                    field.onChange(toNumberOrUndefined(value))
                    form.setValue('regionId', undefined)
                    form.setValue('areaId', undefined)
                    form.setValue('areaIds', [])
                    form.setValue('rangeId', undefined)
                    form.setValue('territoryId', undefined)
                    form.setValue('agencyId', undefined)
                  }}
                  disabled={!filteredSubChannels.length || !channelValue}
                >
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select Sub Channel' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subChannelOptions.map((subChannel, index) => (
                        <SelectItem
                          key={`${subChannel.value}-${index}`}
                          value={subChannel.value}
                        >
                          {subChannel.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          {showRegion ? (
            <FormField
              control={form.control}
              name='regionId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Region</FormLabel>
                <Select
                  value={toSelectValue(field.value)}
                  onValueChange={(value) => {
                    field.onChange(toNumberOrUndefined(value))
                    form.setValue('areaId', undefined)
                    form.setValue('areaIds', [])
                    form.setValue('rangeId', undefined)
                    form.setValue('territoryId', undefined)
                    form.setValue('agencyId', undefined)
                  }}
                  disabled={!filteredRegions.length || !subChannelValue}
                >
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select Region' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {regionOptions.map((region, index) => (
                        <SelectItem
                          key={`${region.value}-${index}`}
                          value={region.value}
                        >
                          {region.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          {showAreaMulti ? (
            <FormField
              control={form.control}
              name='areaIds'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Area</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={areaMultiOptions}
                      value={areaIdsValue}
                      onValueChange={(value) => field.onChange(value)}
                      placeholder='Select Area'
                      disabled={!filteredAreas.length || !regionValue}
                      className='w-full justify-between'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          {showAreaSingle ? (
            <FormField
              control={form.control}
              name='areaId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Area</FormLabel>
                <Select
                  value={toSelectValue(field.value)}
                  onValueChange={(value) => {
                    field.onChange(toNumberOrUndefined(value))
                    form.setValue('rangeId', undefined)
                    form.setValue('territoryId', undefined)
                    form.setValue('agencyId', undefined)
                  }}
                  disabled={!filteredAreas.length || !regionValue}
                >
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select Area' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {areaSingleOptions.map((area, index) => (
                        <SelectItem
                          key={`${area.value}-${index}`}
                          value={area.value}
                        >
                          {area.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          {showRange ? (
            <FormField
              control={form.control}
              name='rangeId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Range</FormLabel>
                <Select
                  value={toSelectValue(field.value)}
                  onValueChange={(value) => {
                    field.onChange(toNumberOrUndefined(value))
                    form.setValue('territoryId', undefined)
                    form.setValue('agencyId', undefined)
                  }}
                  disabled={!filteredRanges.length || !subChannelValue || !areaValue}
                >
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select Range' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rangeOptions.map((rangeItem, index) => (
                        <SelectItem
                          key={`${rangeItem.value}-${index}`}
                          value={rangeItem.value}
                        >
                          {rangeItem.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          {showTerritory ? (
            <FormField
              control={form.control}
              name='territoryId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Territory</FormLabel>
                <Select
                  value={toSelectValue(field.value)}
                  onValueChange={(value) => {
                    field.onChange(toNumberOrUndefined(value))
                    form.setValue('agencyId', undefined)
                  }}
                  disabled={!areaValue || !rangeValue}
                >
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select Territory' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {territoryOptions.length ? (
                        territoryOptions.map((territory, index) => (
                          <SelectItem
                            key={`${territory.value}-${index}`}
                            value={territory.value}
                          >
                            {territory.label}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value='no-territories' disabled>
                          No territories found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          {showAgency ? (
            <FormField
              control={form.control}
              name='agencyId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Agency</FormLabel>
                <Select
                  value={toSelectValue(field.value)}
                  onValueChange={(value) =>
                    field.onChange(toNumberOrUndefined(value))
                  }
                  disabled={!filteredAgencies.length || !territoryValue}
                >
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select Agency' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {agencyOptions.map((agency, index) => (
                        <SelectItem
                          key={`${agency.value}-${index}`}
                          value={agency.value}
                        >
                          {agency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </div>
        <FormField
          control={form.control}
          name='userLevelId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Access Level</FormLabel>
              <Select
                value={toSelectValue(field.value)}
                onValueChange={(value) =>
                  field.onChange(toNumberOrUndefined(value))
                }
                disabled={!accessLevelOptions.length}
              >
                <FormControl>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select access level' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accessLevelOptionsWithSelected.map((option, index) => (
                    <SelectItem key={`${option.value}-${index}`} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <fieldset className='rounded-lg border border-slate-200 bg-slate-50/70 p-4 shadow-sm'>
          <div className='mb-3 flex flex-wrap items-start justify-between gap-2'>
            <div>
              <p className='text-sm font-semibold text-slate-800'>Password</p>
              <p className='text-xs text-slate-500'>
                To change the password, just add a new password in the field.
              </p>
            </div>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
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
          </div>
        </fieldset>
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
