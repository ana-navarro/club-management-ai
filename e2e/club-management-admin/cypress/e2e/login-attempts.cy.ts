import { createAccount, firstMessage, readResetPath, readTokenFromPath, waitForMessages } from '../support/helpers'

describe('Login attempts', () => {
  const login = (email: string, password: string) =>
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { email, password },
      failOnStatusCode: false,
    })

  it('locks on the third failure, emails once, and unlocks through the link', () => {
    createAccount().then((email) => {
      Cypress._.times(3, () => login(email, 'wrong-password').its('status').should('eq', 401))

      login(email, 'initial-password').then((response) => {
        expect(response.status).to.equal(401)
        expect(response.body).to.deep.equal({ error: 'invalid_credentials' })
      })
      login(email, 'wrong-password').its('status').should('eq', 401)

      cy.wait(1000)
      waitForMessages(email, 1).then((messages) => {
        expect(messages).to.have.length(1)
        expect(messages[0]?.Subject).to.equal('Sign-in attempts on your account')

        readResetPath(firstMessage(messages).ID).then((path) => {
          const token = readTokenFromPath(path)
          cy.request('POST', '/api/auth/reset-password', { token, password: 'brand-new-password' })
          login(email, 'brand-new-password').its('status').should('eq', 200)
        })
      })
    })
  })

  it('starts counting again after a successful login', () => {
    createAccount().then((email) => {
      login(email, 'wrong-password')
      login(email, 'wrong-password')
      login(email, 'initial-password').its('status').should('eq', 200)
      login(email, 'wrong-password')
      login(email, 'wrong-password')
      login(email, 'initial-password').its('status').should('eq', 200)
    })
  })
})
