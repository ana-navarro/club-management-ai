// Entry point of `npm run dev`, `npm run dev:logs` and `npm run dev:down`.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { down, EXIT_FAILED, EXIT_PREREQUISITE, logs, parseArguments, up } from './dev-commands.mjs'

const SERVER_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const WORKSPACE_DIR = join(SERVER_DIR, '..', '..')

// Runs docker. With `inherit`, its output goes straight to the terminal instead of being returned.
function run(args, { inherit = false, timeoutMs } = {}) {
  return new Promise((resolve) => {
    const child = spawn('docker', args, {
      stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr?.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', () => resolve({ code: 127, stdout, stderr }))
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }))
  })
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, '0.0.0.0')
  })
}

const deps = {
  run,
  composeFile: join(SERVER_DIR, 'docker-compose.yml'),
  hasManifest: (project) =>
    existsSync(join(WORKSPACE_DIR, project, 'package.json')) || existsSync(join(WORKSPACE_DIR, project, 'requirements.txt')),
  isPortFree,
  print: (text) => console.log(text),
  now: () => Date.now(),
  sleep,
  onInterrupt: (handler) => process.on('SIGINT', handler),
}

const parsed = parseArguments(process.argv.slice(2))
if (!parsed) {
  console.log('Uso: npm run dev [-- --detach] | npm run dev:logs | npm run dev:down')
  process.exitCode = EXIT_PREREQUISITE
} else {
  try {
    if (parsed.command === 'up') process.exitCode = await up(deps, parsed)
    if (parsed.command === 'logs') process.exitCode = await logs(deps)
    if (parsed.command === 'down') process.exitCode = await down(deps)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = EXIT_FAILED
  }
}
