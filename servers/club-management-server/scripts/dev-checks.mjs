// Checks what the environment needs before anything starts. Nothing here prints a configured value.

const CHECK_TIMEOUT_MS = 10000
const OWNER = 'ana-navarro'

export const PROJECTS = [
  'apps/club-management-client',
  'apps/club-management-admin',
  'services/club-management-client-bff',
  'services/club-management-admin-bff',
  'services/club-management-users-svc',
  'services/club-management-scheduling-svc',
  'services/club-management-payment-svc',
  'services/club-management-championshp-svc',
]

const PORT_VARIABLES = new Map([
  [8080, 'CLIENT_PORT'],
  [8081, 'ADMIN_PORT'],
  [8025, 'MAILPIT_UI_PORT'],
])

export async function checkDocker(run) {
  const compose = await run(['compose', 'version'], { timeoutMs: CHECK_TIMEOUT_MS })
  if (compose.code !== 0) {
    return ['Docker Compose não encontrado. Instale ou atualize o Docker.']
  }
  const docker = await run(['info', '--format', '{{.ServerVersion}}'], { timeoutMs: CHECK_TIMEOUT_MS })
  return docker.code === 0 ? [] : ['O Docker não está em execução. Inicie o Docker e tente de novo.']
}

export function checkRepositories(hasManifest) {
  return PROJECTS.filter((project) => !hasManifest(project)).map((project) => {
    const name = project.split('/')[1]
    return `Repositório não encontrado: ${project}\n    Clone com: git clone https://github.com/${OWNER}/${name}.git ${project}`
  })
}

export function readPublishedPorts(config) {
  return Object.entries(config.services).flatMap(([service, definition]) =>
    (definition.ports ?? []).map((port) => ({
      service,
      target: Number(port.target),
      published: Number(port.published),
    })),
  )
}

export async function checkPorts(ports, runningServices, isPortFree) {
  const problems = []
  for (const { service, target, published } of ports) {
    if (runningServices.has(service) || (await isPortFree(published))) continue
    problems.push(
      `Porta ${published} em uso. Libere a porta ou troque ${PORT_VARIABLES.get(target) ?? 'a porta'} em servers/club-management-server/.env`,
    )
  }
  return problems
}
