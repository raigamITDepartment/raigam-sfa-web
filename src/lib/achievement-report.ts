import * as XLSX from 'xlsx'

type RecordLike = Record<string, unknown>

export type AchievementReportSummary = {
  recordCount: number
  filledCells: number
  sheetsUpdated: number
  skippedRecords: number
  templateName: string
  startDate?: string
  endDate?: string
}

type BuildAchievementReportOptions = {
  templateUrl: string
  payload: unknown
  startDate?: string
  endDate?: string
}

type BuildAchievementReportResult = {
  workbookArray: ArrayBuffer
  fileName: string
  summary: AchievementReportSummary
}

type SheetContext = {
  sheetName: string
  worksheet: XLSX.WorkSheet
  range: XLSX.Range
  headerRow: number
  itemColumn: number
  columnMap: Map<string, number>
  totalColumns: Set<number>
  itemRowMap: Map<string, number>
  srRowMap: Map<string, number>
  itemTokenIndex: ItemTokenEntry[]
  itemMatchCache: Map<string, number | null>
}

const DATE_KEYS = [
  'date',
  'achievementDate',
  'reportDate',
  'salesDate',
  'day',
  'dayNo',
  'dayNumber',
]
const ITEM_KEYS = [
  'itemDescription',
  'itemName',
  'item',
  'productName',
  'skuName',
  'sku',
  'itemDesc',
]
const TERRITORY_KEYS = [
  'territory',
  'territoryName',
  'areaName',
  'routeName',
  'clusterName',
  'rmsName',
]
const VALUE_KEYS = [
  'soldQty',
  'totalSoldValue',
  'value',
  'qty',
  'quantity',
  'sales',
  'amount',
  'total',
  'achievement',
  'target',
]
const SR_KEYS = ['sr', 'srNo', 'serial', 'serialNo', 'row', 'rowNo']
const NESTED_LIST_KEYS = [
  'achievementReportDTOs',
  'achievementReportDtos',
  'items',
  'rows',
  'details',
  'data',
  'list',
]
const NESTED_VALUE_KEYS = [
  'values',
  'territories',
  'territoryValues',
  'areaValues',
]
const DAILY_CONTAINER_KEYS = [
  'daily',
  'details',
  'records',
  'rows',
  'list',
  'achievementReportDTOs',
  'achievementReportDtos',
]
const CUM_CONTAINER_KEYS = ['cumulative', 'cum', 'summary']

const EXCLUDED_KEY_SET = new Set(
  [
    ...DATE_KEYS,
    ...ITEM_KEYS,
    ...TERRITORY_KEYS,
    ...VALUE_KEYS,
    ...SR_KEYS,
  ].map((key) => normalizeKey(key))
)

export async function buildAchievementReportFile(
  options: BuildAchievementReportOptions
): Promise<BuildAchievementReportResult> {
  const { templateUrl, payload, startDate, endDate } = options
  if (!templateUrl) {
    throw new Error('Template URL is required.')
  }

  const workbook = await loadWorkbook(templateUrl)
  const templateName = getTemplateName(templateUrl)
  const cumSheetName = findCumulativeSheetName(workbook)
  const cumContext =
    (cumSheetName && buildSheetContext(workbook, cumSheetName)) ||
    buildSheetContext(workbook, workbook.SheetNames[0])
  if (!cumContext) {
    throw new Error('Template format not recognized.')
  }

  const sheetContextCache = new Map<string, SheetContext | null>()
  sheetContextCache.set(cumContext.sheetName, cumContext)

  const { dailyRecords, cumulativeRecords } = extractRecords(payload)
  const cumulativeMap = new Map<string, number>()

  let filledCells = 0
  let skippedRecords = 0
  const touchedSheets = new Set<string>()

  const getContext = (sheetName: string | null) => {
    if (!sheetName) return null
    if (sheetContextCache.has(sheetName)) {
      return sheetContextCache.get(sheetName) ?? null
    }
    const ctx = buildSheetContext(workbook, sheetName)
    sheetContextCache.set(sheetName, ctx)
    return ctx
  }

  for (const record of dailyRecords) {
    const daySheet = resolveDaySheetName(record, workbook.SheetNames)
    const context = getContext(daySheet)
    const baseContext = context ?? cumContext
    const entries = extractEntries(record, baseContext)
    if (!entries.length) {
      skippedRecords += 1
      continue
    }

    if (context) {
      const applied = applyEntries(context, entries)
      if (applied > 0) {
        filledCells += applied
        touchedSheets.add(context.sheetName)
      }
    }

    for (const entry of entries) {
      const numeric = parseNumeric(entry.value)
      if (numeric === null) continue
      const key = `${entry.itemKey ?? ''}||${entry.srKey ?? ''}||${
        entry.territoryKey
      }`
      cumulativeMap.set(key, (cumulativeMap.get(key) ?? 0) + numeric)
    }
  }

  if (cumulativeRecords.length) {
    for (const record of cumulativeRecords) {
      const entries = extractEntries(record, cumContext)
      if (!entries.length) {
        skippedRecords += 1
        continue
      }
      const applied = applyEntries(cumContext, entries)
      if (applied > 0) {
        filledCells += applied
        touchedSheets.add(cumContext.sheetName)
      }
    }
  } else if (cumulativeMap.size > 0) {
    const entries: Entry[] = []
    for (const [key, value] of cumulativeMap.entries()) {
      const [itemKey, srKey, territoryKey] = key.split('||')
      entries.push({
        itemKey: itemKey || undefined,
        srKey: srKey || undefined,
        territoryKey,
        value,
      })
    }
    const applied = applyEntries(cumContext, entries)
    if (applied > 0) {
      filledCells += applied
      touchedSheets.add(cumContext.sheetName)
    }
  }

  const workbookProps = (workbook.Workbook ?? {}) as XLSX.WBProps & {
    CalcPr?: { fullCalc?: boolean }
  }
  workbookProps.CalcPr = {
    ...(workbookProps.CalcPr ?? {}),
    fullCalc: true,
  }
  workbook.Workbook = workbookProps

  const workbookArray = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  const fileName = buildFileName(templateName, startDate, endDate)

  const summary: AchievementReportSummary = {
    recordCount: dailyRecords.length + cumulativeRecords.length,
    filledCells,
    sheetsUpdated: touchedSheets.size,
    skippedRecords,
    templateName,
    startDate,
    endDate,
  }

  return { workbookArray, fileName, summary }
}

function normalizeKey(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '')
}

type ItemTokenEntry = {
  row: number
  label: string
  normalized: string
  tokens: string[]
}

const ITEM_SYNONYMS: Record<string, string> = {
  angle: 'angel',
  suger: 'sugar',
  margerine: 'margarine',
  margareen: 'margarine',
  lable: 'label',
  welcom: 'welcome',
  multy: 'multi',
  purpes: 'purpose',
  yest: 'yeast',
}

const ITEM_STOP_WORDS = new Set([
  'pack',
  'box',
  'bulk',
  'backet',
  'bucket',
  'pkt',
  'bag',
  'bags',
  'bottle',
  'can',
])

const UNIT_SYNONYMS: Record<string, string> = {
  gr: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kgs: 'kg',
  l: 'l',
  lt: 'l',
  ltr: 'l',
  litre: 'l',
  liter: 'l',
  ml: 'ml',
}

function tokenizeItemName(value: unknown) {
  if (value === null || value === undefined) return []
  const raw = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  if (!raw) return []
  const parts = raw.split(/\s+/g).filter(Boolean)
  const tokens: string[] = []
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i]
    const numericMatch = part.match(/^(\d+)([a-z]+)$/)
    if (numericMatch) {
      const unit = UNIT_SYNONYMS[numericMatch[2]] ?? numericMatch[2]
      tokens.push(`${numericMatch[1]}${unit}`)
      continue
    }

    if (/^\d+$/.test(part) && i + 1 < parts.length) {
      const next = parts[i + 1]
      const unit = UNIT_SYNONYMS[next]
      if (unit) {
        tokens.push(`${part}${unit}`)
        i += 1
        continue
      }
    }

    const normalized = ITEM_SYNONYMS[part] ?? part
    if (!normalized || ITEM_STOP_WORDS.has(normalized)) continue
    tokens.push(normalized)
  }
  return Array.from(new Set(tokens))
}

function hasNumericToken(tokens: string[]) {
  return tokens.some((token) => /^\d/.test(token))
}

function tokenSimilarity(a: string[], b: string[]) {
  if (!a.length || !b.length) return 0
  const setA = new Set(a)
  const setB = new Set(b)
  let intersection = 0
  for (const token of setA) {
    if (setB.has(token)) intersection += 1
  }
  if (intersection === 0) return 0
  const union = setA.size + setB.size - intersection
  return union ? intersection / union : 0
}

function numericTokenIntersection(a: string[], b: string[]) {
  const setA = new Set(a.filter((token) => /^\d/.test(token)))
  if (!setA.size) return 0
  let intersection = 0
  for (const token of b) {
    if (setA.has(token)) intersection += 1
  }
  return intersection
}

function resolveItemRow(
  context: SheetContext,
  itemKey?: string,
  itemLabel?: string
) {
  if (itemKey && context.itemRowMap.has(itemKey)) {
    return context.itemRowMap.get(itemKey)
  }
  if (!itemLabel) return undefined
  const cacheKey = normalizeKey(itemLabel)
  if (context.itemMatchCache.has(cacheKey)) {
    return context.itemMatchCache.get(cacheKey) ?? undefined
  }
  const tokens = tokenizeItemName(itemLabel)
  if (!tokens.length) {
    context.itemMatchCache.set(cacheKey, null)
    return undefined
  }
  const requireNumeric = hasNumericToken(tokens)
  let best: ItemTokenEntry | null = null
  let bestScore = 0
  for (const entry of context.itemTokenIndex) {
    if (requireNumeric && hasNumericToken(entry.tokens)) {
      if (numericTokenIntersection(tokens, entry.tokens) === 0) {
        continue
      }
    }
    const score = tokenSimilarity(tokens, entry.tokens)
    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }

  const threshold = 0.5
  if (best && bestScore >= threshold) {
    context.itemMatchCache.set(cacheKey, best.row)
    return best.row
  }
  context.itemMatchCache.set(cacheKey, null)
  return undefined
}

function normalizeTerritoryKey(value: unknown) {
  if (value === null || value === undefined) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  const withoutParen = raw.replace(/\([A-Za-z]\)$/u, '').trim()
  const withoutSuffix = withoutParen.replace(/[\s\-\/]+[A-Za-z]$/u, '').trim()
  const normalized = normalizeKey(withoutSuffix || raw)
  return normalized
}

function resolveTerritoryKey(
  value: unknown,
  columnMap: Map<string, number>
) {
  const primary = normalizeTerritoryKey(value)
  if (primary && columnMap.has(primary)) return primary
  const fallback = normalizeKey(value)
  if (fallback && columnMap.has(fallback)) return fallback
  return null
}

function buildFileName(
  templateName: string,
  startDate?: string,
  endDate?: string
) {
  const base = templateName
    .replace(/\.[^.]+$/, '')
    .replace(/\s+/g, '-')
    .trim()
  const datePart =
    startDate && endDate
      ? `${startDate}_to_${endDate}`
      : startDate
        ? startDate
        : endDate
          ? endDate
          : 'report'
  return `Achievement_${base || 'report'}_${datePart}.xlsx`
}

async function loadWorkbook(templateUrl: string) {
  const response = await fetch(templateUrl)
  if (!response.ok) {
    throw new Error(`Failed to load template (${response.status})`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return XLSX.read(arrayBuffer, {
    type: 'array',
    cellFormula: true,
    cellStyles: true,
    cellNF: true,
    cellDates: true,
  })
}

function getTemplateName(templateUrl: string) {
  const path = templateUrl.split('?')[0] ?? ''
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] || 'template'
}

function findCumulativeSheetName(workbook: XLSX.WorkBook) {
  return (
    workbook.SheetNames.find((name) =>
      normalizeKey(name).includes('cum')
    ) || null
  )
}

function buildSheetContext(
  workbook: XLSX.WorkBook,
  sheetName: string | undefined
): SheetContext | null {
  if (!sheetName) return null
  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet || !worksheet['!ref']) return null
  const range = XLSX.utils.decode_range(worksheet['!ref'])

  const headerRow = findHeaderRow(worksheet, range)
  if (headerRow === null) return null

  const itemColumn = findItemColumn(worksheet, headerRow, range)
  const columnMap = new Map<string, number>()
  const totalColumns = new Set<number>()
  for (let c = itemColumn + 1; c <= range.e.c; c += 1) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: headerRow, c })]
    if (!cell || typeof cell.v !== 'string') continue
    const normalized = normalizeKey(cell.v)
    const territoryNormalized = normalizeTerritoryKey(cell.v)
    if (!normalized) continue
    if (!columnMap.has(normalized)) {
      columnMap.set(normalized, c)
    }
    if (
      territoryNormalized &&
      territoryNormalized !== normalized &&
      !columnMap.has(territoryNormalized)
    ) {
      columnMap.set(territoryNormalized, c)
    }
    if (normalized.includes('total') || normalized.includes('tatal')) {
      totalColumns.add(c)
    }
  }

  const itemRowMap = new Map<string, number>()
  const srRowMap = new Map<string, number>()
  const itemTokenIndex: ItemTokenEntry[] = []
  const itemMatchCache = new Map<string, number | null>()
  for (let r = headerRow + 1; r <= range.e.r; r += 1) {
    const itemCell = worksheet[XLSX.utils.encode_cell({ r, c: itemColumn })]
    const normalizedItem =
      itemCell && typeof itemCell.v === 'string'
        ? normalizeKey(itemCell.v)
        : ''
    if (normalizedItem && !normalizedItem.includes('total')) {
      if (!itemRowMap.has(normalizedItem)) {
        itemRowMap.set(normalizedItem, r)
      }
      if (itemCell && typeof itemCell.v === 'string') {
        const tokens = tokenizeItemName(itemCell.v)
        if (tokens.length) {
          itemTokenIndex.push({
            row: r,
            label: itemCell.v,
            normalized: normalizedItem,
            tokens,
          })
        }
      }
    }
    const srCell = worksheet[XLSX.utils.encode_cell({ r, c: range.s.c })]
    if (!srCell || srCell.v === null || srCell.v === undefined) continue
    const srValue =
      typeof srCell.v === 'number' ? String(srCell.v) : String(srCell.v).trim()
    if (!srValue) continue
    if (!srRowMap.has(srValue)) {
      srRowMap.set(srValue, r)
    }
  }

  return {
    sheetName,
    worksheet,
    range,
    headerRow,
    itemColumn,
    columnMap,
    totalColumns,
    itemRowMap,
    srRowMap,
    itemTokenIndex,
    itemMatchCache,
  }
}

function findHeaderRow(worksheet: XLSX.WorkSheet, range: XLSX.Range) {
  const maxRow = Math.min(range.s.r + 10, range.e.r)
  const headerTarget = 'rmsitems'
  for (let r = range.s.r; r <= maxRow; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r, c })]
      if (!cell || typeof cell.v !== 'string') continue
      if (normalizeKey(cell.v) === headerTarget) return r
    }
  }

  const fallbackTarget = 'itemdescription'
  for (let r = range.s.r; r <= maxRow; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r, c })]
      if (!cell || typeof cell.v !== 'string') continue
      if (normalizeKey(cell.v) === fallbackTarget) return r
    }
  }

  return null
}

function findItemColumn(
  worksheet: XLSX.WorkSheet,
  headerRow: number,
  range: XLSX.Range
) {
  const itemTargets = new Set(['rmsitems', 'itemdescription'])
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: headerRow, c })]
    if (!cell || typeof cell.v !== 'string') continue
    if (itemTargets.has(normalizeKey(cell.v))) return c
  }
  return Math.min(range.s.c + 1, range.e.c)
}

function extractRecords(payload: unknown) {
  if (Array.isArray(payload)) {
    return {
      dailyRecords: flattenRecordArray(payload),
      cumulativeRecords: [],
    }
  }

  if (!payload || typeof payload !== 'object') {
    return { dailyRecords: [], cumulativeRecords: [] }
  }

  const record = payload as RecordLike
  let cumulativeRecords: RecordLike[] = []
  for (const key of CUM_CONTAINER_KEYS) {
    const value = record[key]
    if (Array.isArray(value)) {
      cumulativeRecords = flattenRecordArray(value)
      break
    }
  }

  let dailyRecords: RecordLike[] = []
  for (const key of DAILY_CONTAINER_KEYS) {
    const value = record[key]
    if (Array.isArray(value)) {
      dailyRecords = flattenRecordArray(value)
      break
    }
  }

  if (!dailyRecords.length) {
    const fallback = Object.values(record).find(Array.isArray)
    if (Array.isArray(fallback)) {
      dailyRecords = flattenRecordArray(fallback)
    }
  }

  return { dailyRecords, cumulativeRecords }
}

function flattenRecordArray(values: unknown[]) {
  const flattened: RecordLike[] = []
  values.forEach((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return
    const record = entry as RecordLike
    const nested = findNestedArray(record)
    if (nested) {
      const dateValue = extractDate(record)
      nested.forEach((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return
        const child = item as RecordLike
        if (dateValue && child.date === undefined && child.day === undefined) {
          flattened.push({ ...child, date: dateValue })
        } else {
          flattened.push(child)
        }
      })
      return
    }
    flattened.push(record)
  })
  return flattened
}

function findNestedArray(record: RecordLike) {
  for (const key of NESTED_LIST_KEYS) {
    const value = record[key]
    if (Array.isArray(value)) return value
  }
  return null
}

function extractDate(record: RecordLike) {
  const keyIndex = buildKeyIndex(record)
  return getRecordValue(record, keyIndex, DATE_KEYS)
}

function buildKeyIndex(record: RecordLike) {
  const map = new Map<string, string>()
  Object.keys(record).forEach((key) => {
    const normalized = normalizeKey(key)
    if (!normalized) return
    if (!map.has(normalized)) {
      map.set(normalized, key)
    }
  })
  return map
}

function getRecordValue(
  record: RecordLike,
  keyIndex: Map<string, string>,
  candidates: string[]
) {
  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate)
    const key = keyIndex.get(normalized)
    if (!key) continue
    const value = record[key]
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }
  return undefined
}

function resolveDaySheetName(record: RecordLike, sheetNames: string[]) {
  const keyIndex = buildKeyIndex(record)
  const dateValue = getRecordValue(record, keyIndex, DATE_KEYS)
  const day = parseDayValue(dateValue)
  if (!day) return null
  const sheetName = String(day)
  return sheetNames.includes(sheetName) ? sheetName : null
}

function parseDayValue(value: unknown) {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 1 && value <= 31 ? Math.trunc(value) : null
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getDate()
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (isoMatch) {
      const day = Number(isoMatch[3])
      return day >= 1 && day <= 31 ? day : null
    }
    const numeric = Number(trimmed)
    if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 31) {
      return Math.trunc(numeric)
    }
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getDate()
    }
  }
  return null
}

type Entry = {
  itemKey?: string
  itemLabel?: string
  srKey?: string
  territoryKey: string
  value: unknown
}

function extractEntries(record: RecordLike, context: SheetContext): Entry[] {
  const keyIndex = buildKeyIndex(record)
  const itemValue = getRecordValue(record, keyIndex, ITEM_KEYS)
  const srValue = getRecordValue(record, keyIndex, SR_KEYS)
  const itemKey = itemValue ? normalizeKey(itemValue) : undefined
  const itemLabel =
    itemValue !== undefined && itemValue !== null ? String(itemValue) : undefined
  const srKey =
    srValue !== undefined && srValue !== null && srValue !== ''
      ? String(srValue).trim()
      : undefined

  const hasRow =
    (itemKey && context.itemRowMap.has(itemKey)) ||
    (srKey && context.srRowMap.has(srKey))
  if (!hasRow) return []

  const entries: Entry[] = []
  const territoryValue = getRecordValue(record, keyIndex, TERRITORY_KEYS)
  const valueValue = getRecordValue(record, keyIndex, VALUE_KEYS)

  if (territoryValue !== undefined && territoryValue !== null) {
    const territoryKey = resolveTerritoryKey(
      territoryValue,
      context.columnMap
    )
    if (territoryKey && valueValue !== undefined && valueValue !== null) {
      entries.push({
        itemKey,
        itemLabel,
        srKey,
        territoryKey,
        value: valueValue,
      })
      return entries
    }
  }

  const nestedValues = getRecordValue(record, keyIndex, NESTED_VALUE_KEYS)
  if (nestedValues && typeof nestedValues === 'object' && !Array.isArray(nestedValues)) {
    Object.entries(nestedValues as RecordLike).forEach(([key, value]) => {
      const territoryKey = resolveTerritoryKey(key, context.columnMap)
      if (!territoryKey) return
      entries.push({ itemKey, itemLabel, srKey, territoryKey, value })
    })
    return entries
  }

  Object.entries(record).forEach(([key, value]) => {
    const normalizedKey = normalizeKey(key)
    if (!normalizedKey || EXCLUDED_KEY_SET.has(normalizedKey)) return
    const territoryKey = resolveTerritoryKey(key, context.columnMap)
    if (!territoryKey) return
    entries.push({ itemKey, itemLabel, srKey, territoryKey, value })
  })

  return entries
}

function applyEntries(context: SheetContext, entries: Entry[]) {
  let applied = 0
  entries.forEach((entry) => {
    const rowIndex = entry.itemKey || entry.itemLabel
      ? resolveItemRow(context, entry.itemKey, entry.itemLabel)
      : entry.srKey
        ? context.srRowMap.get(entry.srKey)
        : undefined
    if (rowIndex === undefined) return
    const columnIndex = context.columnMap.get(entry.territoryKey)
    if (columnIndex === undefined) return
    if (context.totalColumns.has(columnIndex)) return
    const updated = setCellValue(
      context.worksheet,
      rowIndex,
      columnIndex,
      entry.value
    )
    if (updated) applied += 1
  })
  return applied
}

function setCellValue(
  worksheet: XLSX.WorkSheet,
  rowIndex: number,
  columnIndex: number,
  value: unknown
) {
  const cellValue = toCellValue(value)
  if (!cellValue) return false
  const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })
  const existing = worksheet[address]
  if (existing?.f) return false
  if (
    existing &&
    existing.t === 'n' &&
    typeof existing.v === 'number' &&
    cellValue.t === 'n' &&
    typeof cellValue.v === 'number'
  ) {
    worksheet[address] = {
      ...existing,
      t: 'n',
      v: existing.v + cellValue.v,
    }
    return true
  }
  worksheet[address] = {
    ...(existing ?? {}),
    ...cellValue,
  }
  return true
}

function toCellValue(value: unknown) {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { t: 'n' as const, v: value }
  }
  if (typeof value === 'boolean') {
    return { t: 'b' as const, v: value }
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { t: 'd' as const, v: value }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const numeric = parseNumeric(trimmed)
    if (numeric !== null) {
      return { t: 'n' as const, v: numeric }
    }
    return { t: 's' as const, v: trimmed }
  }
  return { t: 's' as const, v: String(value) }
}

function parseNumeric(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const normalized = trimmed.replace(/,/g, '')
    const parsed = Number(normalized)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}
