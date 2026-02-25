import fs from 'fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'path'
import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

function safeFileName(value: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!cleaned) return 'survey-form-schema.json'
  if (cleaned.endsWith('.json')) return cleaned
  return `${cleaned}.json`
}

function normalizeViewRoutePath(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return '/test-form'
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function createJsonResponse(
  res: ServerResponse<IncomingMessage>,
  statusCode: number,
  payload: Record<string, unknown>
) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function saveFormSchemaPlugin(): Plugin {
  return {
    name: 'save-form-schema-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        '/api/form-builder/list-json',
        async (
          req: IncomingMessage,
          res: ServerResponse<IncomingMessage>,
          next: () => void
        ) => {
          if (req.method !== 'GET') {
            next()
            return
          }

          try {
            const dataDir = path.resolve(__dirname, 'src/data')
            await fs.mkdir(dataDir, { recursive: true })
            const entries = await fs.readdir(dataDir, { withFileTypes: true })

            const forms = await Promise.all(
              entries
                .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
                .map(async (entry) => {
                  const filePath = path.resolve(dataDir, entry.name)
                  const raw = await fs.readFile(filePath, 'utf8')
                  const parsed = JSON.parse(raw) as {
                    title?: unknown
                    fields?: unknown
                    viewRoutePath?: unknown
                  }

                  if (
                    typeof parsed.title !== 'string' ||
                    !Array.isArray(parsed.fields)
                  ) {
                    return null
                  }

                  const stat = await fs.stat(filePath)
                  return {
                    fileName: entry.name,
                    title: parsed.title,
                    fieldCount: parsed.fields.length,
                    updatedAt: stat.mtime.toISOString(),
                    size: stat.size,
                    viewRoutePath: normalizeViewRoutePath(
                      typeof parsed.viewRoutePath === 'string'
                        ? parsed.viewRoutePath
                        : '/test-form'
                    ),
                  }
                })
            )

            const cleaned = forms
              .filter((item): item is NonNullable<typeof item> => Boolean(item))
              .sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              )

            createJsonResponse(res, 200, { forms: cleaned })
          } catch {
            createJsonResponse(res, 500, {
              message: 'Failed to load saved forms.',
              forms: [],
            })
          }
        }
      )

      server.middlewares.use(
        '/api/form-builder/read-json',
        async (
          req: IncomingMessage,
          res: ServerResponse<IncomingMessage>,
          next: () => void
        ) => {
          if (req.method !== 'GET') {
            next()
            return
          }

          try {
            const requestUrl = new URL(req.url ?? '/', 'http://localhost')
            const fileName = requestUrl.searchParams.get('fileName')
            if (!fileName) {
              createJsonResponse(res, 400, { message: 'fileName is required.' })
              return
            }

            const safeName = safeFileName(fileName)
            const targetPath = path.resolve(__dirname, 'src/data', safeName)
            const raw = await fs.readFile(targetPath, 'utf8')
            const parsed = JSON.parse(raw) as unknown

            createJsonResponse(res, 200, {
              fileName: safeName,
              data: parsed,
            })
          } catch {
            createJsonResponse(res, 404, { message: 'Form file not found.' })
          }
        }
      )

      server.middlewares.use(
        '/api/form-builder/delete-json',
        async (
          req: IncomingMessage,
          res: ServerResponse<IncomingMessage>,
          next: () => void
        ) => {
          if (req.method !== 'DELETE') {
            next()
            return
          }

          try {
            const requestUrl = new URL(req.url ?? '/', 'http://localhost')
            const fileName = requestUrl.searchParams.get('fileName')
            if (!fileName) {
              createJsonResponse(res, 400, { message: 'fileName is required.' })
              return
            }

            const safeName = safeFileName(fileName)
            const targetPath = path.resolve(__dirname, 'src/data', safeName)
            await fs.unlink(targetPath)

            createJsonResponse(res, 200, {
              message: `Deleted src/data/${safeName}`,
              filePath: `src/data/${safeName}`,
            })
          } catch {
            createJsonResponse(res, 404, { message: 'Form file not found.' })
          }
        }
      )

      server.middlewares.use(
        '/api/form-builder/save-json',
        async (
          req: IncomingMessage,
          res: ServerResponse<IncomingMessage>,
          next: () => void
        ) => {
          if (req.method !== 'POST') {
            next()
            return
          }

          try {
            const body = await new Promise<string>((resolve, reject) => {
              const chunks: Buffer[] = []

              req.on('data', (chunk: Buffer | string) => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
              })
              req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
              req.on('error', reject)
            })

            const parsed = JSON.parse(body) as {
              fileName?: string
              data?: unknown
            }

            if (!parsed?.data || typeof parsed.data !== 'object') {
              createJsonResponse(res, 400, { message: 'Invalid schema payload.' })
              return
            }

            const fileName = safeFileName(
              typeof parsed.fileName === 'string' ? parsed.fileName : 'survey-form-schema.json'
            )
            const targetPath = path.resolve(__dirname, 'src/data', fileName)

            await fs.writeFile(targetPath, JSON.stringify(parsed.data, null, 2), 'utf8')

            createJsonResponse(res, 200, {
              message: `Saved to src/data/${fileName}`,
              filePath: `src/data/${fileName}`,
            })
          } catch {
            createJsonResponse(res, 500, { message: 'Failed to save JSON file.' })
          }
        }
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    saveFormSchemaPlugin(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routeFileIgnorePattern: 'user-list-(columns|export|utils)\\.(ts|tsx)$',
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'build',
    chunkSizeWarningLimit: 1000,
  },
})
