// The up, logs and down commands. Everything that touches the system comes in through `deps`.
import { checkDocker, checkPorts, checkRepositories, readPublishedPorts } from './dev-checks.mjs'
import { decideEnvironment, parseServices } from './dev-status.mjs'

export const WAIT_LIMIT_MS = 10 * 60 * 1000
const CHECK_INTERVAL_MS = 2000
const LOG_LINES = 50
const FIRST_AFFECTED_KERNEL = [6, 19]

export const EXIT_OK = 0
export const EXIT_PREREQUISITE = 1
export const EXIT_FAILED = 2

export function parseArguments(argv) {
  const [command, ...flags] = argv
  const known = ['up', 'logs', 'down'].includes(command)
  const allowedFlags = command === 'up' ? ['--detach'] : []
  if (!known || flags.some((flag) => !allowedFlags.includes(flag))) return null
  return { command, detach: flags.includes('--detach') }
}

const compose = (deps, args, options) => deps.run(['compose', '-f', deps.composeFile, ...args], options)

async function readServices(deps) {
  const result = await compose(deps, ['ps', '-a', '--format', 'json'])
  if (result.code !== 0) throw new Error('Não foi possível ler o estado dos serviços no Docker.')
  return parseServices(result.stdout)
}

async function readConfig(deps) {
  const result = await compose(deps, ['config', '--format', 'json'])
  if (result.code !== 0) throw new Error('Não foi possível ler a configuração do ambiente.')
  return JSON.parse(result.stdout)
}

async function findProblems(deps) {
  const problems = checkRepositories(deps.hasManifest)
  const dockerProblems = await checkDocker(deps.run)
  if (dockerProblems.length > 0) return { problems: [...dockerProblems, ...problems] }

  const config = await readConfig(deps)
  const ports = readPublishedPorts(config)
  const running = new Set(
    (await readServices(deps)).filter((service) => service.State === 'running').map((service) => service.Service),
  )
  return { problems: [...problems, ...(await checkPorts(ports, running, deps.isPortFree))], config, ports }
}

function isAffectedKernel(version) {
  const match = /^(\d+)\.(\d+)/.exec(version.trim())
  if (!match) return false
  const [major, minor] = [Number(match[1]), Number(match[2])]
  return major > FIRST_AFFECTED_KERNEL[0] || (major === FIRST_AFFECTED_KERNEL[0] && minor >= FIRST_AFFECTED_KERNEL[1])
}

async function reportFailures(deps, failed) {
  for (const { Service, ExitCode, State } of failed) {
    const reason = State === 'running' ? 'não ficou saudável' : `falhou (código ${ExitCode})`
    deps.print(`\nO serviço ${Service} ${reason}. Últimas linhas do log:\n`)
    const logs = await compose(deps, ['logs', '--no-color', '--tail', String(LOG_LINES), Service])
    deps.print(logs.stdout.trimEnd())

    if (Service === 'mongo') {
      const kernel = await deps.run(['info', '--format', '{{.KernelVersion}}'])
      if (kernel.code === 0 && isAffectedKernel(kernel.stdout)) {
        deps.print(
          `\nO kernel ${kernel.stdout.trim()} é 6.19 ou mais novo, e o MongoDB 8.0 em diante pode não iniciar nele.\nVeja https://jira.mongodb.org/browse/SERVER-121912`,
        )
      }
    }
  }
  deps.print('\nPara ver tudo: npm run dev:logs')
}

async function waitUntilReady(deps, expected, startedAt) {
  let lastProgress = ''
  for (;;) {
    const decision = decideEnvironment({
      services: await readServices(deps),
      expected,
      elapsedMs: deps.now() - startedAt,
      limitMs: WAIT_LIMIT_MS,
    })
    if (decision.status !== 'waiting') return decision

    const progress = `Serviços prontos: ${decision.ready} de ${decision.total}`
    if (progress !== lastProgress) deps.print(progress)
    lastProgress = progress
    await deps.sleep(CHECK_INTERVAL_MS)
  }
}

function formatAddresses(ports) {
  const address = (target) => {
    const port = ports.find((candidate) => candidate.target === target)
    return port ? `http://localhost:${port.published}` : 'indisponível'
  }
  return [
    `  Client:          ${address(8080)}`,
    `  Admin:           ${address(8081)}`,
    `  Emails de teste: ${address(8025)}`,
    `  Google e Facebook simulados: ${address(8090)}`,
  ].join('\n')
}

export async function up(deps, { detach }) {
  const startedAt = deps.now()
  const { problems, config, ports } = await findProblems(deps)
  if (problems.length > 0) {
    deps.print(`Não foi possível iniciar o ambiente:\n\n${problems.map((problem) => `  - ${problem}`).join('\n')}`)
    return EXIT_PREREQUISITE
  }

  const started = await compose(deps, ['up', '-d'], { inherit: true })

  // When Docker gives up, a failed dependency is the useful answer, so there is nothing to wait for.
  const expected = Object.keys(config.services)
  const decision =
    started.code === 0
      ? await waitUntilReady(deps, expected, startedAt)
      : decideEnvironment({ services: await readServices(deps), expected, elapsedMs: WAIT_LIMIT_MS, limitMs: WAIT_LIMIT_MS })

  if (decision.status === 'failed') {
    await reportFailures(deps, decision.failed)
    return EXIT_FAILED
  }
  if (decision.status === 'timeout') {
    const reason = started.code === 0 ? 'O limite de 10 minutos passou' : 'O Docker não conseguiu iniciar o ambiente'
    deps.print(`\n${reason}. Ainda esperando: ${decision.waiting.join(', ')}\nPara ver tudo: npm run dev:logs`)
    return EXIT_FAILED
  }

  const seconds = Math.round((deps.now() - startedAt) / 1000)
  deps.print(`\nAmbiente pronto em ${seconds}s\n\n${formatAddresses(ports)}\n`)
  if (detach) {
    deps.print('Para acompanhar os logs: npm run dev:logs\nPara encerrar: npm run dev:down')
    return EXIT_OK
  }
  deps.print('Ctrl+C para de mostrar os logs. O ambiente continua em execução.\nPara encerrar: npm run dev:down\n')
  return logs(deps)
}

// Ctrl+C reaches the log process too, so this only has to keep Node alive until it ends.
export async function logs(deps) {
  let interrupted = false
  deps.onInterrupt(() => {
    interrupted = true
  })
  const followed = await compose(deps, ['logs', '-f', '--tail', String(LOG_LINES)], { inherit: true })
  if (interrupted) {
    deps.print('\nO ambiente continua em execução. Para encerrar: npm run dev:down')
    return EXIT_OK
  }
  return followed.code
}

export async function down(deps) {
  const stopped = await compose(deps, ['down'], { inherit: true })
  return stopped.code === 0 ? EXIT_OK : EXIT_FAILED
}
