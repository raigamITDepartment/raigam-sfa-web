type BlobStorageConfig = {
  endpoint: string
  container: string
  sasToken: string
}

export type BlobFormListItem = {
  fileName: string
  updatedAt: string
  size: number
}

function parseConnectionString(value: string): Record<string, string> {
  return value
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const equalIndex = part.indexOf('=')
      if (equalIndex < 0) return acc
      const key = part.slice(0, equalIndex).trim()
      const rawValue = part.slice(equalIndex + 1).trim()
      if (!key || !rawValue) return acc
      acc[key] = rawValue
      return acc
    }, {})
}

function normalizeSasToken(rawToken: string): string {
  const trimmed = rawToken.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('?') ? trimmed.slice(1) : trimmed
}

function getBlobStorageConfig(): BlobStorageConfig | null {
  const connectionString =
    import.meta.env.VITE_FORM_BUILDER_STORAGE_CONNECTION_STRING ?? ''
  const connectionParts = parseConnectionString(connectionString)

  const endpointFromEnv = import.meta.env.VITE_FORM_BUILDER_BLOB_ENDPOINT ?? ''
  const endpoint = (endpointFromEnv || connectionParts.BlobEndpoint || '')
    .trim()
    .replace(/\/+$/, '')

  const tokenFromEnv = import.meta.env.VITE_FORM_BUILDER_BLOB_SAS_TOKEN ?? ''
  const sasToken = normalizeSasToken(tokenFromEnv || connectionParts.SharedAccessSignature || '')

  const container =
    (import.meta.env.VITE_FORM_BUILDER_BLOB_CONTAINER ?? '').trim() ||
    'form-builder'

  if (!endpoint || !sasToken || !container) return null

  return {
    endpoint,
    container,
    sasToken,
  }
}

export function isBlobStorageConfigured(): boolean {
  return Boolean(getBlobStorageConfig())
}

function buildBlobUrl(blobName?: string, extraParams?: Record<string, string>): string {
  const config = getBlobStorageConfig()
  if (!config) {
    throw new Error('Azure Blob storage is not configured.')
  }

  const pathname = blobName
    ? `${config.container}/${encodeURIComponent(blobName)}`
    : config.container

  const url = new URL(`${config.endpoint}/${pathname}`)
  const allParams = new URLSearchParams(config.sasToken)

  if (extraParams) {
    Object.entries(extraParams).forEach(([key, value]) => {
      allParams.set(key, value)
    })
  }

  url.search = allParams.toString()
  return url.toString()
}

export async function getFormSchemaFromBlob(fileName: string): Promise<unknown> {
  const response = await fetch(buildBlobUrl(fileName))
  if (!response.ok) {
    throw new Error(`Blob file "${fileName}" not found.`)
  }

  const rawText = await response.text()
  if (!rawText.trim()) {
    throw new Error(`Blob file "${fileName}" is empty.`)
  }

  try {
    return JSON.parse(rawText) as unknown
  } catch {
    throw new Error(`Blob file "${fileName}" is not valid JSON.`)
  }
}

export async function saveFormSchemaToBlob(
  fileName: string,
  data: unknown
): Promise<void> {
  const response = await fetch(buildBlobUrl(fileName), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-ms-blob-type': 'BlockBlob',
      'x-ms-version': '2021-12-02',
    },
    body: JSON.stringify(data, null, 2),
  })

  if (!response.ok) {
    const responseText = await response.text()
    throw new Error(
      `Failed to save "${fileName}" to Azure Blob. ${responseText || response.statusText}`
    )
  }
}

export async function deleteFormSchemaFromBlob(fileName: string): Promise<void> {
  const response = await fetch(buildBlobUrl(fileName), {
    method: 'DELETE',
    headers: {
      'x-ms-version': '2021-12-02',
    },
  })

  if (!response.ok && response.status !== 404) {
    const responseText = await response.text()
    throw new Error(
      `Failed to delete "${fileName}" from Azure Blob. ${responseText || response.statusText}`
    )
  }
}

export async function listFormSchemasFromBlob(): Promise<BlobFormListItem[]> {
  const response = await fetch(
    buildBlobUrl(undefined, { restype: 'container', comp: 'list' })
  )
  if (!response.ok) {
    const responseText = await response.text()
    throw new Error(
      `Failed to list Azure Blob files. ${responseText || response.statusText}`
    )
  }

  const xmlText = await response.text()
  const xml = new DOMParser().parseFromString(xmlText, 'application/xml')
  const parserError = xml.querySelector('parsererror')
  if (parserError) {
    throw new Error('Invalid XML response from Azure Blob list API.')
  }

  return Array.from(xml.getElementsByTagName('Blob'))
    .map((blobNode) => {
      const name = blobNode.getElementsByTagName('Name')[0]?.textContent?.trim() ?? ''
      if (!name.toLowerCase().endsWith('.json')) return null

      const updatedAt =
        blobNode
          .getElementsByTagName('Last-Modified')[0]
          ?.textContent?.trim() ?? new Date().toISOString()
      const sizeText =
        blobNode
          .getElementsByTagName('Content-Length')[0]
          ?.textContent?.trim() ?? '0'
      const size = Number.parseInt(sizeText, 10)

      return {
        fileName: name,
        updatedAt,
        size: Number.isNaN(size) ? 0 : size,
      }
    })
    .filter((item): item is BlobFormListItem => Boolean(item))
}
