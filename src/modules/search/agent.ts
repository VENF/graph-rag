import { streamText, stepCountIs } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { GraphIndexData } from './types.js'
import { buildTools } from './tools.js'
import { SYSTEM_PROMPT } from './prompt.js'
import { env } from '../../../config/env.js'

export const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY })

export interface AgentOptions {
  graphDir: string
  index: GraphIndexData
  modelName?: string
  maxSteps?: number
}

export interface AgentRunOptions {
  onText?: (text: string) => void
  onToolCall?: (name: string, args: unknown) => void
  onToolResult?: (name: string, result: unknown) => void
  signal?: AbortSignal
}

export function createAgent(opts: AgentOptions) {
  const model = google(opts.modelName || 'gemini-3.1-flash-lite-preview')
  const tools = buildTools(opts.graphDir)
  const steps = opts.maxSteps ?? 15

  async function run(query: string, runOpts?: AgentRunOptions): Promise<string> {
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: query }],
      tools,
      stopWhen: stepCountIs(steps),
      abortSignal: runOpts?.signal,
      onChunk: ({ chunk }) => {
        switch (chunk.type) {
          case 'text-delta':
            runOpts?.onText?.(chunk.text)
            break
          case 'tool-call':
            runOpts?.onToolCall?.(chunk.toolName, chunk.input)
            break
          case 'tool-result':
            runOpts?.onToolResult?.(chunk.toolName, chunk.output)
            break
        }
      },
    })

    return result.text
  }

  async function runWithHistory(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    runOpts?: AgentRunOptions,
  ): Promise<string> {
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages,
      tools,
      stopWhen: stepCountIs(steps),
      abortSignal: runOpts?.signal,
      onChunk: ({ chunk }) => {
        switch (chunk.type) {
          case 'text-delta':
            runOpts?.onText?.(chunk.text)
            break
          case 'tool-call':
            runOpts?.onToolCall?.(chunk.toolName, chunk.input)
            break
          case 'tool-result':
            runOpts?.onToolResult?.(chunk.toolName, chunk.output)
            break
        }
      },
    })

    return result.text
  }

  return { run, runWithHistory }
}
