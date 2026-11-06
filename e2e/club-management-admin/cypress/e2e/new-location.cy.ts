import { createAccount, waitForMessages } from '../support/helpers'

describe('Login from a new location', () => {
  const login = (email: string, ip?: string) =>
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { email, password: 'initial-password' },
      headers: ip ? { 'X-Real-IP': ip } : {},
    })

  it('does not warn on the first login or from a known network', () => {
    createAccount().then((email) => {
      login(email)
      login(email)
      cy.wait(1000)
      waitForMessages(email, 1, 0).should('have.length', 0)
    })
  })

  it('ignores an address forged by the caller', () => {
    createAccount().then((email) => {
      login(email)
      login(email, '200.200.200.200')
      cy.wait(1000)
      waitForMessages(email, 1, 0).should('have.length', 0)
    })
  })
})
