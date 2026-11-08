const PROBE = (url: string) =>
  [
    'import httpx',
    'try:',
    `  print("status", httpx.get("${url}", verify=False, timeout=5).status_code)`,
    'except Exception:',
    '  print("refused")',
  ].join('\n')

const probeFromBff = (url: string) =>
  cy.task<string>(
    'composeExec',
    { service: 'client-bff', command: ['python', '-c', PROBE(url)] },
    { timeout: 120000 },
  )

describe('Internal communication', () => {
  it('reaches the BFF through the gateway', () => {
    cy.request('/api/health').its('body').should('deep.equal', { status: 'ok' })
  })

  it('users service refuses a call without a certificate', () => {
    probeFromBff('https://users-svc:3001/health').should('contain', 'refused')
  })

  it('users service refuses plain HTTP', () => {
    probeFromBff('http://users-svc:3001/health').should('contain', 'refused')
  })

  it('the BFF refuses a call without a certificate', () => {
    probeFromBff('https://client-bff:8000/health').should('contain', 'refused')
  })
})
