import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { checkDocker, checkPorts, checkRepositories, PROJECTS, readPublishedPorts } from './dev-checks.mjs'

const runner = (codes) => async (args, options) => {
  assert.equal(options.timeoutMs, 10000)
  return { code: codes[args[0]] ?? 0, stdout: '', stderr: '' }
}

describe('checkDocker', () => {
  it('passes when Compose and the daemon answer', async () => {
    assert.deepEqual(await checkDocker(runner({})), [])
  })

  it('asks to install when Compose is missing', async () => {
    assert.match((await checkDocker(runner({ compose: 1 })))[0], /Instale ou atualize/)
  })

  it('asks to start the daemon when it is stopped', async () => {
    assert.match((await checkDocker(runner({ info: 1 })))[0], /Inicie o Docker/)
  })
})

describe('checkRepositories', () => {
  it('covers the 8 projects', () => {
    assert.equal(PROJECTS.length, 8)
    assert.deepEqual(checkRepositories(() => true), [])
  })

  it('lists every missing repository with its clone command', () => {
    const problems = checkRepositories((project) => !project.endsWith('-svc'))
    assert.equal(problems.length, 4)
    assert.match(problems[0], /services\/club-management-users-svc/)
    assert.match(problems[0], /git clone https:\/\/github\.com\/ana-navarro\/club-management-users-svc\.git services\/club-management-users-svc/)
  })
})

describe('readPublishedPorts', () => {
  it('reads the ports of the services that publish one', () => {
    const config = {
      services: {
        mongo: {},
        nginx: { ports: [{ target: 8080, published: '9000' }] },
      },
    }
    assert.deepEqual(readPublishedPorts(config), [{ service: 'nginx', target: 8080, published: 9000 }])
  })
})

describe('checkPorts', () => {
  const ports = [
    { service: 'nginx', target: 8080, published: 8080 },
    { service: 'nginx', target: 8081, published: 9001 },
    { service: 'mailpit', target: 8025, published: 8025 },
    { service: 'oauth-mock', target: 8090, published: 8090 },
    { service: 'other', target: 1, published: 1 },
  ]

  it('names each occupied port and the variable that changes it', async () => {
    const problems = await checkPorts(ports, new Set(), async () => false)
    assert.deepEqual(
      problems.map((problem) => problem.split('.')[0]),
      ['Porta 8080 em uso', 'Porta 9001 em uso', 'Porta 8025 em uso', 'Porta 8090 em uso', 'Porta 1 em uso'],
    )
    assert.match(problems[0], /CLIENT_PORT/)
    assert.match(problems[1], /ADMIN_PORT/)
    assert.match(problems[2], /MAILPIT_UI_PORT/)
    assert.match(problems[3], /OAUTH_MOCK_PORT/)
    assert.match(problems[4], /troque a porta/)
  })

  it('ignores the ports of the running environment', async () => {
    const asked = []
    const problems = await checkPorts(ports, new Set(['nginx', 'mailpit', 'oauth-mock', 'other']), async (port) => {
      asked.push(port)
      return false
    })
    assert.deepEqual(problems, [])
    assert.deepEqual(asked, [])
  })

  it('accepts free ports', async () => {
    assert.deepEqual(await checkPorts(ports, new Set(), async () => true), [])
  })
})
