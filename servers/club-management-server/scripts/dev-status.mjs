// Reads the state of the environment and decides whether it is ready, waiting or failed.

const ONE_SHOT_SERVICES = new Set(['certs'])

function readService(value) {
  if (typeof value?.Service !== 'string' || typeof value?.State !== 'string') {
    throw new Error('O Docker devolveu um estado de serviço em formato inesperado.')
  }
  return {
    Service: value.Service,
    State: value.State,
    Health: typeof value.Health === 'string' ? value.Health : '',
    ExitCode: typeof value.ExitCode === 'number' ? value.ExitCode : 0,
  }
}

// Compose prints either one JSON array or one object per line, depending on its version.
export function parseServices(text) {
  const trimmed = text.trim()
  if (!trimmed) return []
  try {
    const parsed = trimmed.startsWith('[')
      ? JSON.parse(trimmed)
      : trimmed.split(/\r?\n/).map((line) => JSON.parse(line))
    return parsed.map(readService)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('O Docker devolveu um estado de serviço em formato inesperado.')
    }
    throw error
  }
}

export function decideService({ Service, State, Health, ExitCode }) {
  if (State === 'running' && Health === 'healthy') return 'ready'
  if (State === 'running' && Health === 'unhealthy') return 'failed'
  if (State === 'exited' && ExitCode === 0 && ONE_SHOT_SERVICES.has(Service)) return 'ready'
  if (State === 'exited' || State === 'dead') return 'failed'
  return 'waiting'
}

export function decideEnvironment({ services, expected, elapsedMs, limitMs }) {
  const byName = new Map(services.map((service) => [service.Service, service]))
  const failed = services.filter((service) => decideService(service) === 'failed')
  if (failed.length > 0) return { status: 'failed', failed }

  const waiting = expected.filter((name) => {
    const service = byName.get(name)
    return !service || decideService(service) !== 'ready'
  })
  const ready = expected.length - waiting.length

  if (waiting.length === 0) return { status: 'ready', ready, total: expected.length, waiting }
  if (elapsedMs >= limitMs) return { status: 'timeout', ready, total: expected.length, waiting }
  return { status: 'waiting', ready, total: expected.length, waiting }
}
