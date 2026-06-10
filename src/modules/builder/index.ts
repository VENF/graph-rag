import fs from 'fs'
import path from 'path'
import { loadConfig } from './config.js'
import { readSourceFiles, parseFile } from './parser.js'
import { extractAllNodes } from './extractor.js'
import { buildRelations } from './relations.js'
import { generateGraphFiles } from './generator.js'
import { buildAuditReport } from './audit.js'

interface CliOptions {
  config?: string
  input?: string
  output?: string
}

function printHelp(): void {
  console.log(`
Uso: npx tsx src/modules/builder/index.ts [opciones]

Opciones:
  -c, --config <ruta>   Ruta a pipeline_config.yaml (defecto: ./pipeline_config.yaml)
  -i, --input <dir>     Sobrescribe directorio de entrada
  -o, --output <dir>    Sobrescribe directorio de salida
  --help                Muestra esta ayuda

Ejemplos:
  npx tsx src/modules/builder/index.ts
  npx tsx src/modules/builder/index.ts --input ../knowledge-base --output ../knowledge-graph
  npx tsx src/modules/builder/index.ts -c ./custom_config.yaml
`)
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const opts: CliOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help') {
      printHelp()
      throw new Error('mostrar-ayuda')
    }
    if (arg === '-c' || arg === '--config') {
      opts.config = args[++i]
    } else if (arg === '-i' || arg === '--input') {
      opts.input = args[++i]
    } else if (arg === '-o' || arg === '--output') {
      opts.output = args[++i]
    }
  }

  return opts
}

async function main(): Promise<void> {
  const opts = parseArgs()

  const configPath = opts.config
    ? path.resolve(opts.config)
    : path.join(process.cwd(), 'pipeline_config.yaml')

  console.log(`Cargando config desde: ${configPath}`)
  const config = loadConfig(configPath)

  if (opts.input) {
    config.input.dir = path.resolve(opts.input)
    if (!fs.existsSync(config.input.dir)) {
      console.error(`Error: directorio de entrada no existe: ${config.input.dir}`)
      process.exit(1)
    }
  }
  if (opts.output) {
    config.output.dir = path.resolve(opts.output)
  }

  console.log(`Directorio de entrada: ${config.input.dir}`)
  console.log(`Directorio de salida: ${config.output.dir}`)

  const sourceFiles = readSourceFiles(config.input.dir, config.input.patterns)

  if (sourceFiles.length === 0) {
    console.error('No se encontraron archivos fuente con patrones:', config.input.patterns)
    console.error(`En el directorio: ${config.input.dir}`)
    process.exit(1)
  }

  console.log(`Encontrados ${sourceFiles.length} archivo(s) fuente:`)
  for (const f of sourceFiles) {
    console.log(`  - ${path.basename(f)}`)
  }

  const parsedFiles = sourceFiles.flatMap((f) => {
    const filename = path.basename(f)
    console.log(`\nParseando: ${filename}`)
    try {
      const result = parseFile(f, filename)
      console.log(`  Artículos: ${result.articles.length}`)
      console.log(`  Códigos: ${result.codes.length}`)
      console.log(`  Regímenes: ${result.regimes.length}`)
      console.log(`  Capítulos SA: ${result.sa_chapters.length}`)
      return [result]
    } catch (err) {
      console.error(`  Error parseando ${filename}: ${(err as Error).message}`)
      return []
    }
  })

  console.log('\nExtrayendo nodos...')
  const nodos = extractAllNodes(parsedFiles)

  console.log('Construyendo relaciones...')
  const relaciones = buildRelations(nodos, parsedFiles)

  console.log('Generando archivos del grafo...')
  generateGraphFiles(nodos, relaciones, config)

  console.log('\nAnalizando resultados...')
  buildAuditReport(parsedFiles, nodos)
}

main().catch((err) => {
  if ((err as Error).message !== 'mostrar-ayuda') {
    console.error('Error fatal:', err)
    process.exit(1)
  }
})
