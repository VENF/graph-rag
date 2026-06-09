import readline from 'readline'

const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export interface ReplConfig {
  processQuery: (query: string, events: {
    onText: (text: string) => void
    onToolCall: (name: string, args: unknown) => void
    onToolResult: (name: string, result: unknown) => void
  }) => Promise<string>
}

function formatResult(result: unknown): string {
  if (Array.isArray(result)) {
    if (result.length === 0) return 'sin resultados'
    return result.slice(0, 5).join(', ') + (result.length > 5 ? `... (+${result.length - 5})` : '')
  }
  if (typeof result === 'string') {
    const lines = result.split('\n').filter(Boolean)
    if (lines.length === 0) return '(vacío)'
    const first = lines[0].substring(0, 100)
    return first + (lines.length > 1 || first.length > 100 ? '...' : '')
  }
  return JSON.stringify(result).substring(0, 120)
}

function formatArgs(args: unknown): string {
  const s = JSON.stringify(args)
  return s.length > 80 ? s.substring(0, 80) + '...' : s
}

export function startRepl({ processQuery }: ReplConfig): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'search> ',
  })

  const history: Array<{ role: 'user' | 'assistant'; content: string }> = []

  let spinnerInterval: ReturnType<typeof setInterval> | null = null
  let spinnerFrame = 0

  function startSpinner() {
    spinnerFrame = 0
    if (spinnerInterval) return
    spinnerInterval = setInterval(() => {
      process.stdout.write(`\r${SPINNER[spinnerFrame]} Pensando...`)
      spinnerFrame = (spinnerFrame + 1) % SPINNER.length
    }, 80)
  }

  function stopSpinner() {
    if (spinnerInterval) {
      clearInterval(spinnerInterval)
      spinnerInterval = null
      process.stdout.write('\r' + ' '.repeat(30) + '\r')
    }
  }

  function clearLine() {
    stopSpinner()
  }

  console.log('🔍 Agente de búsqueda arancelaria')
  console.log('Escribe tu consulta en lenguaje natural.')
  console.log('"salir" o Ctrl+C para terminar.\n')

  rl.prompt()

  rl.on('line', async (line: string) => {
    const input = line.trim()
    if (!input) {
      rl.prompt()
      return
    }

    if (['salir', 'exit', 'quit'].includes(input.toLowerCase())) {
      console.log('Hasta luego!')
      rl.close()
      return
    }

    history.push({ role: 'user', content: input })
    startSpinner()

    try {
      const response = await processQuery(input, {
        onText: (text: string) => {
          clearLine()
          process.stdout.write(text)
        },
        onToolCall: (name: string, args: unknown) => {
          clearLine()
          process.stdout.write(`\n🔧 ${name}(${formatArgs(args)})\n`)
        },
        onToolResult: (name: string, result: unknown) => {
          clearLine()
          const preview = formatResult(result)
          process.stdout.write(`📄 ${preview}\n`)
        },
      })
      clearLine()

      if (response) {
        process.stdout.write('\n')
      }
      history.push({ role: 'assistant', content: response })
    } catch (err) {
      clearLine()
      console.error('\nError:', (err as Error).message)
    }

    rl.prompt()
  })

  rl.on('close', () => {
    clearLine()
    process.exit(0)
  })

  process.on('SIGINT', () => {
    clearLine()
    console.log('\nHasta luego!')
    process.exit(0)
  })
}
