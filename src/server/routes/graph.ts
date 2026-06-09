import fs from 'fs'
import path from 'path'
import type { FastifyInstance } from 'fastify'
import { startBuildJob, getJob } from '../services/builder-service.js'
import { clearIndexCache, getGraphDir } from '../services/search-service.js'

function countMdFiles(dir: string): number {
  if (!fs.existsSync(dir)) return 0
  let count = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const subdir = path.join(dir, entry.name)
      count += fs.readdirSync(subdir).filter((f) => f.endsWith('.md')).length
    }
  }
  return count
}

export function registerGraphRoutes(app: FastifyInstance): void {
  app.delete('/api/v1/graph', async (request, reply) => {
    const { confirm } = request.query as { confirm?: string }

    if (confirm !== 'true') {
      return reply.status(400).send({
        error: 'confirmación requerida',
        hint: 'agrega ?confirm=true para confirmar la eliminación',
      })
    }

    const graphDir = getGraphDir()
    const indexPath = path.join(graphDir, '.graph-index.json')

    try {
      const nodesBefore = countMdFiles(graphDir)

      app.log.warn({ graphDir, nodesBefore }, 'Eliminando grafo de conocimiento')

      fs.rmSync(graphDir, { recursive: true, force: true })
      clearIndexCache()

      return {
        deleted: true,
        path: graphDir,
        nodesRemoved: nodesBefore,
      }
    } catch (err) {
      request.log.error({ err }, 'Error al eliminar grafo')
      return reply.status(500).send({ error: (err as Error).message })
    }
  })

  app.post('/api/v1/build-graph', async (request, reply) => {
    try {
      const jobId = startBuildJob()
      return reply.status(202).send({ jobId })
    } catch (err) {
      request.log.error({ err }, 'Build-graph failed to start')
      return reply.status(500).send({ error: (err as Error).message })
    }
  })

  app.get('/api/v1/jobs/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string }
    const job = getJob(jobId)

    if (!job) {
      return reply.status(404).send({ error: `Job ${jobId} no encontrado` })
    }

    return {
      id: job.id,
      status: job.status,
      startedAt: job.startedAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
      error: job.error,
    }
  })
}
