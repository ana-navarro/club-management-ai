import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { down, EXIT_FAILED, EXIT_OK, EXIT_PREREQUISITE, logs, parseArguments, up, WAIT_LIMIT_MS } from './dev-commands.mjs'

const CONFIG = {
  services: {
    certs: {},
    mongo: {},
    nginx: {
      ports: [
        { target: 8080, published: '8080' },
        { target: 8081, published: '9001' },
      ],
    },
    mailpit: { ports: [{ target: 8025, published: '8025' }] },
  },
}
const line = (Service, State, Health = '', ExitCode = 0) => JSON.stringify({ Service, State, Health, ExitCode })
const READY = [
  line('certs', 'exited'),
  line('mongo', 'running', 'healthy'),
  line('nginx', 'running', 'healthy'),
  line('mailpit', 'running', 'healthy'),
].join('\n')

// A system where each answer can be replaced. `ps` answers come in order, repeating the last one.
function createDeps({ states = [READY], answers = {}, hasManifest = () => true, isPortFree = async () => true, interruptLogs = false } = {}) {
  const calls = []
  const printed = []
  const queue = [...states]
  let clock = 0
  let interrupt = () => {}

  const run = async (args, options = {}) => {
    const name = args[0] === 'compose' && args[1] === '-f' ? args.slice(3).join(' ') : args.join(' ')
    calls.push({ name, options })
    if (name in answers) return { code: 0, stdout: '', stderr: '', ...answers[name] }
    if (name === 'config --format json') return { code: 0, stdout: JSON.stringify(CONFIG), stderr: '' }
    if (name === 'ps -a --format json') {
      const stdout = queue.length > 1 ? queue.shift() : queue[0]
      return { code: 0, stdout, stderr: '' }
    }
    if (name.startsWith('logs -f') && interruptLogs) {
      interrupt()
      return { code: 130, stdout: '', stderr: '' }
    }
    return { code: 0, stdout: '', stderr: '' }
  }

  return {
    names: () => calls.map((call) => call.name),
    printed,
    output: () => printed.join('\n'),
    run,
    composeFile: 'compose.yml',
    hasManifest,
    isPortFree,
    print: (text) => printed.push(text),
    now: () => clock,
    sleep: async (ms) => {
      clock += ms
    },
    onInterrupt: (handler) => {
      interrupt = handler
    },
  }
}

describe('parseArguments', () => {
  it('reads the commands and the flag', () => {
    assert.deepEqual(parseArguments(['up']), { command: 'up', detach: false })
    assert.deepEqual(parseArguments(['up', '--detach']), { command: 'up', detach: true })
    assert.deepEqual(parseArguments(['logs']), { command: 'logs', detach: false })
    assert.deepEqual(parseArguments(['down']), { command: 'down', detach: false })
  })

  it('refuses anything else', () => {
    assert.equal(parseArguments([]), null)
    assert.equal(parseArguments(['restart']), null)
    assert.equal(parseArguments(['up', '--other']), null)
    assert.equal(parseArguments(['down', '--detach']), null)
  })
})

describe('up', () => {
  it('checks, starts, waits and shows the addresses, without following logs when detached', async () => {
    const deps = createDeps()
    assert.equal(await up(deps, { detach: true }), EXIT_OK)

    const names = deps.names()
    assert.ok(names.indexOf('compose version') < names.indexOf('up -d'))
    assert.ok(names.indexOf('info --format {{.ServerVersion}}') < names.indexOf('up -d'))
    assert.ok(names.indexOf('config --format json') < names.indexOf('up -d'))
    assert.equal(names.some((name) => name.startsWith('logs -f')), false)
    assert.match(deps.output(), /Ambiente pronto em 0s/)
    assert.match(deps.output(), /Client: +http:\/\/localhost:8080/)
    assert.match(deps.output(), /Admin: +http:\/\/localhost:9001/)
    assert.match(deps.output(), /Emails de teste: http:\/\/localhost:8025/)
    assert.match(deps.output(), /npm run dev:down/)
  })

  it('shows each change of progress once, and waits until ready', async () => {
    const waiting = [line('certs', 'exited'), line('mongo', 'running', 'starting')].join('\n')
    const deps = createDeps({ states: ['', waiting, waiting, READY] })
    assert.equal(await up(deps, { detach: true }), EXIT_OK)
    assert.equal(deps.printed.filter((text) => text === 'Serviços prontos: 1 de 4').length, 1)
    assert.match(deps.output(), /Ambiente pronto em 4s/)
  })

  it('follows the logs after it is ready', async () => {
    const deps = createDeps({ interruptLogs: true })
    assert.equal(await up(deps, { detach: false }), EXIT_OK)
    assert.match(deps.output(), /Ctrl\+C para de mostrar os logs/)
    assert.equal(deps.names().filter((name) => name.startsWith('logs -f')).length, 1)
  })

  it('never issues a destructive command, so it can run twice', async () => {
    const deps = createDeps()
    await up(deps, { detach: true })
    await up(deps, { detach: true })
    assert.equal(deps.names().filter((name) => /\b(down|rm|stop|kill)\b|--volumes|\s-v\b/.test(name)).length, 0)
    assert.equal(deps.names().filter((name) => name === 'up -d').length, 2)
  })

  it('does not treat the ports of the running environment as occupied', async () => {
    const deps = createDeps({ isPortFree: async () => false })
    assert.equal(await up(deps, { detach: true }), EXIT_OK)
  })

  it('stops with every prerequisite problem and never starts anything', async () => {
    const deps = createDeps({
      states: [''],
      hasManifest: (project) => !project.endsWith('users-svc'),
      isPortFree: async () => false,
    })
    assert.equal(await up(deps, { detach: true }), EXIT_PREREQUISITE)
    assert.equal(deps.names().includes('up -d'), false)
    assert.match(deps.output(), /club-management-users-svc/)
    assert.match(deps.output(), /Porta 8080 em uso/)
    assert.match(deps.output(), /Porta 8025 em uso/)
  })

  it('reports a stopped Docker along with the missing repositories, without asking Docker for more', async () => {
    const deps = createDeps({
      hasManifest: (project) => !project.endsWith('users-svc'),
      answers: { 'info --format {{.ServerVersion}}': { code: 1 } },
    })
    assert.equal(await up(deps, { detach: true }), EXIT_PREREQUISITE)
    assert.match(deps.output(), /Inicie o Docker/)
    assert.match(deps.output(), /club-management-users-svc/)
    assert.equal(deps.names().includes('config --format json'), false)
  })

  it('reports a failed service with its logs and leaves the environment running', async () => {
    const deps = createDeps({
      states: ['', line('users-svc', 'exited', '', 1)],
      answers: { 'logs --no-color --tail 50 users-svc': { stdout: 'boom\n' } },
    })
    assert.equal(await up(deps, { detach: true }), EXIT_FAILED)
    assert.match(deps.output(), /O serviço users-svc falhou \(código 1\)/)
    assert.match(deps.output(), /boom/)
    assert.doesNotMatch(deps.output(), /SERVER-121912/)
    assert.equal(deps.names().includes('down'), false)
  })

  it('reports an unhealthy service', async () => {
    const deps = createDeps({ states: ['', line('nginx', 'running', 'unhealthy')] })
    assert.equal(await up(deps, { detach: true }), EXIT_FAILED)
    assert.match(deps.output(), /O serviço nginx não ficou saudável/)
  })

  const mongoFailure = (kernel, code = 0) =>
    createDeps({
      states: ['', line('mongo', 'exited', '', 14)],
      answers: { 'info --format {{.KernelVersion}}': { code, stdout: kernel } },
    })

  for (const version of ['6.19.0-azure', '7.0.0-1017-azure']) {
    it(`explains the kernel when mongo fails on ${version}`, async () => {
      const deps = mongoFailure(version)
      assert.equal(await up(deps, { detach: true }), EXIT_FAILED)
      assert.match(deps.output(), /SERVER-121912/)
    })
  }

  for (const [version, code] of [['6.18.54.1-microsoft-standard-WSL2', 0], ['5.15.0', 0], ['unknown', 0], ['7.0.0', 1]]) {
    it(`does not blame kernel ${version} with code ${code}`, async () => {
      const deps = mongoFailure(version, code)
      assert.equal(await up(deps, { detach: true }), EXIT_FAILED)
      assert.doesNotMatch(deps.output(), /SERVER-121912/)
    })
  }

  it('reports a dependency that failed while Docker was starting the environment', async () => {
    const deps = createDeps({
      states: ['', line('mongo', 'exited', '', 14)],
      answers: { 'up -d': { code: 1 } },
    })
    assert.equal(await up(deps, { detach: true }), EXIT_FAILED)
    assert.match(deps.output(), /O serviço mongo falhou/)
  })

  it('reports when Docker could not start the environment and no service failed', async () => {
    const deps = createDeps({ states: [''], answers: { 'up -d': { code: 1 } } })
    assert.equal(await up(deps, { detach: true }), EXIT_FAILED)
    assert.match(deps.output(), /O Docker não conseguiu iniciar o ambiente/)
    assert.match(deps.output(), /certs, mongo, nginx, mailpit/)
  })

  it('gives up after the limit, listing who still waits', async () => {
    const deps = createDeps({ states: ['', line('certs', 'exited')] })
    assert.equal(await up(deps, { detach: true }), EXIT_FAILED)
    assert.ok(deps.now() >= WAIT_LIMIT_MS)
    assert.match(deps.output(), /O limite de 10 minutos passou/)
    assert.match(deps.output(), /mongo, nginx, mailpit/)
  })

  it('explains when the Docker state cannot be read', async () => {
    const deps = createDeps({ answers: { 'ps -a --format json': { code: 1 } } })
    await assert.rejects(up(deps, { detach: true }), /estado dos serviços/)
  })

  it('explains when the configuration cannot be read', async () => {
    const deps = createDeps({ answers: { 'config --format json': { code: 1 } } })
    await assert.rejects(up(deps, { detach: true }), /configuração do ambiente/)
  })

  it('never prints the configuration', async () => {
    const deps = createDeps()
    await up(deps, { detach: true })
    assert.doesNotMatch(deps.output(), /"services"/)
  })

  it('shows an address as unavailable when no port is published', async () => {
    const deps = createDeps({
      answers: { 'config --format json': { stdout: JSON.stringify({ services: { certs: {} } }) } },
      states: [line('certs', 'exited')],
    })
    assert.equal(await up(deps, { detach: true }), EXIT_OK)
    assert.match(deps.output(), /Client: +indisponível/)
  })
})

describe('logs', () => {
  it('follows the logs and treats Ctrl+C as success, without stopping anything', async () => {
    const deps = createDeps({ interruptLogs: true })
    assert.equal(await logs(deps), EXIT_OK)
    assert.deepEqual(deps.names(), ['logs -f --tail 50'])
    assert.match(deps.output(), /continua em execução/)
  })

  it('returns the code of a log process that ended by itself', async () => {
    const deps = createDeps({ answers: { 'logs -f --tail 50': { code: 3 } } })
    assert.equal(await logs(deps), 3)
  })
})

describe('down', () => {
  it('stops the environment and never removes volumes', async () => {
    const deps = createDeps()
    assert.equal(await down(deps), EXIT_OK)
    assert.deepEqual(deps.names(), ['down'])
  })

  it('reports a failure', async () => {
    const deps = createDeps({ answers: { down: { code: 1 } } })
    assert.equal(await down(deps), EXIT_FAILED)
  })
})
