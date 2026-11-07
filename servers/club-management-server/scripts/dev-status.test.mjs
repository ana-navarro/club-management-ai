import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { decideEnvironment, decideService, parseServices } from './dev-status.mjs'

const service = (Service, State, Health = '', ExitCode = 0) => ({ Service, State, Health, ExitCode })

describe('parseServices', () => {
  it('reads one object per line', () => {
    const text = '{"Service":"mongo","State":"running","Health":"healthy","ExitCode":0}\r\n{"Service":"certs","State":"exited","ExitCode":0}\n'
    assert.deepEqual(parseServices(text), [service('mongo', 'running', 'healthy'), service('certs', 'exited')])
  })

  it('reads one array', () => {
    assert.deepEqual(parseServices('[{"Service":"mongo","State":"exited","ExitCode":14}]'), [service('mongo', 'exited', '', 14)])
  })

  it('accepts an empty answer', () => {
    assert.deepEqual(parseServices(' \n'), [])
  })

  for (const text of ['not json', '[{"State":"running"}]', '{"Service":"mongo"}', 'null']) {
    it(`refuses ${text} with a clear error`, () => {
      assert.throws(() => parseServices(text), /formato inesperado/)
    })
  }
})

describe('decideService', () => {
  const cases = [
    ['ready', service('mongo', 'running', 'healthy')],
    ['ready', service('certs', 'exited', '', 0)],
    ['failed', service('certs', 'exited', '', 1)],
    ['failed', service('mongo', 'exited', '', 0)],
    ['failed', service('mongo', 'exited', '', 14)],
    ['failed', service('mongo', 'dead')],
    ['failed', service('mongo', 'running', 'unhealthy')],
    ['waiting', service('mongo', 'running', 'starting')],
    ['waiting', service('mongo', 'running')],
    ['waiting', service('mongo', 'created')],
    ['waiting', service('mongo', 'restarting')],
  ]
  for (const [expected, input] of cases) {
    it(`${input.Service} ${input.State} ${input.Health} ${input.ExitCode} is ${expected}`, () => {
      assert.equal(decideService(input), expected)
    })
  }
})

describe('decideEnvironment', () => {
  const expected = ['certs', 'mongo', 'nginx']
  const ready = [service('certs', 'exited'), service('mongo', 'running', 'healthy'), service('nginx', 'running', 'healthy')]
  const decide = (services, elapsedMs = 0) => decideEnvironment({ services, expected, elapsedMs, limitMs: 600000 })

  it('is ready when every expected service is ready', () => {
    assert.deepEqual(decide(ready), { status: 'ready', ready: 3, total: 3, waiting: [] })
  })

  it('lets a failure win over the rest', () => {
    const failed = service('mongo', 'exited', '', 14)
    assert.deepEqual(decide([ready[0], failed, service('nginx', 'running', 'starting')], 700000), { status: 'failed', failed: [failed] })
  })

  it('waits for an expected service that is missing from the list', () => {
    assert.deepEqual(decide(ready.slice(0, 2)), { status: 'waiting', ready: 2, total: 3, waiting: ['nginx'] })
  })

  it('reports who still waits when the limit passes', () => {
    assert.deepEqual(decide(ready.slice(0, 2), 600000), { status: 'timeout', ready: 2, total: 3, waiting: ['nginx'] })
  })
})
