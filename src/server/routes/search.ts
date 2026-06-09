import type { FastifyInstance } from 'fastify'
import { SearchQuerySchema } from '../schemas/api.js'
import { search, searchStream, reindex, getStatsData } from '../services/search-service.js'

const SEARCH_TIMEOUT = 60_000

function writeSSE(reply: any, event: string, data: unknown): void {
  if (reply.raw.destroyed) return
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  reply.raw.write(payload)
}

export function registerSearchRoutes(app: FastifyInstance): void {
  app.post('/api/v1/search', async (request, reply) => {
    const parsed = SearchQuerySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message })
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT)
      const result = await search(parsed.data.query, controller.signal)
      clearTimeout(timeout)
      return result
    } catch (err) {
      request.log.error({ err }, 'Search failed')
      if ((err as Error).name === 'AbortError') {
        return reply.status(504).send({ error: 'La consulta excedió el tiempo máximo' })
      }
      return reply.status(500).send({ error: (err as Error).message })
    }
  })

  app.post('/api/v1/search/stream', async (request, reply) => {
    const parsed = SearchQuerySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message })
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT)
      await searchStream(parsed.data.query, {
        onText: (text: string) => writeSSE(reply, 'text-delta', { text }),
        onToolCall: (name: string, args: unknown) => writeSSE(reply, 'tool-call', { name, args }),
        onToolResult: (name: string, result: unknown) => writeSSE(reply, 'tool-result', { name, result }),
      }, controller.signal)
      clearTimeout(timeout)

      writeSSE(reply, 'done', {})
    } catch (err) {
      request.log.error({ err }, 'Stream search failed')
      writeSSE(reply, 'error', { error: (err as Error).message })
    } finally {
      if (!reply.raw.destroyed) {
        reply.raw.end()
      }
    }
  })

  app.post('/api/v1/reindex', async (_request, reply) => {
    try {
      const index = reindex()
      return { totalNodes: index.metadata.totalNodes, counts: index.metadata.counts }
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message })
    }
  })

  app.get('/api/v1/stats', async (_request, reply) => {
    try {
      const stats = getStatsData()
      return stats
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message })
    }
  })
}
