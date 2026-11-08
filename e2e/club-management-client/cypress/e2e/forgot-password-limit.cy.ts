import { createClientAccount, firstMessage, readResetPath, readTokenFromPath, waitForMessages } from '../support/helpers'

describe('Password reset request limit', () => {
  it('stops at 5 requests and starts over after a password change', () => {
    const ask = (email: string) =>
      cy.request('POST', '/api/auth/forgot-password', { email, language: 'en' }).its('status').should('eq', 202)

    createClientAccount().then((email) => {
      Cypress._.times(5, () => {
        ask(email)
        cy.wait(300)
      })
      waitForMessages(email, 5).should('have.length', 5)

      ask(email)
      cy.wait(1500)
      waitForMessages(email, 6, 0).then((messages) => {
        expect(messages).to.have.length(5)
        // Mailpit lists the newest first, and a new request replaces the previous link.
        readResetPath(firstMessage(messages).ID).then((path) => {
          const token = readTokenFromPath(path)
          cy.request('POST', '/api/auth/reset-password', { token, password: 'brand-new-password' })
            .its('status')
            .should('eq', 204)
        })
      })

      ask(email)
      waitForMessages(email, 6).should('have.length', 6)
    })
  })
})
