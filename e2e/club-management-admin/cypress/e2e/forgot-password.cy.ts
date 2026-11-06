import { createAccount, firstMessage, readResetPath, signIn, visitInEnglish, waitForMessages } from '../support/helpers'

describe('Forgot password', () => {
  const request = (email: string) => {
    visitInEnglish('/forgot-password')
    cy.get('input[type=email]').type(email)
    cy.get('button[type=submit]').click()
    cy.contains('If the email is registered')
  }

  it('is public and linked from the login', () => {
    visitInEnglish('/login')
    cy.contains('a', 'Forgot my password').click()
    cy.location('pathname').should('eq', '/forgot-password')
  })

  it('shows the same message for an unknown account and sends nothing', () => {
    const email = `unknown-${Date.now()}@club-management.local`
    request(email)
    cy.wait(1000)
    waitForMessages(email, 1, 0).should('have.length', 0)
  })

  it('recovers the password through the emailed link, which works only once', () => {
    createAccount().then((email) => {
      cy.request('POST', '/api/auth/login', { email, password: 'initial-password' })
        .its('body.token')
        .then((oldToken) => {
          request(email)
          waitForMessages(email, 1).then((messages) => {
            expect(messages[0]?.Subject).to.equal('Password reset')
            readResetPath(firstMessage(messages).ID).then((path) => {
              cy.visit(path)
              cy.contains('h1', 'Create a new password')

              cy.get('input[type=password]').eq(0).type('short')
              cy.get('input[type=password]').eq(1).type('short')
              cy.get('button[type=submit]').click()
              cy.contains('at least 8 characters')

              cy.get('input[type=password]').eq(0).clear().type('brand-new-password')
              cy.get('input[type=password]').eq(1).clear().type('brand-new-password')
              cy.get('button[type=submit]').click()

              cy.location('pathname').should('eq', '/login')
              cy.contains('Password changed.')
              signIn(email, 'brand-new-password')
              cy.location('pathname').should('eq', '/')

              // A token from before the change no longer works.
              cy.request({
                url: '/api/users/me',
                headers: { Authorization: `Bearer ${oldToken}` },
                failOnStatusCode: false,
              })
                .its('status')
                .should('eq', 401)

              // The link was spent.
              cy.window().then((win) => win.sessionStorage.removeItem('session'))
              cy.visit(path)
              cy.get('input[type=password]').eq(0).type('another-password')
              cy.get('input[type=password]').eq(1).type('another-password')
              cy.get('button[type=submit]').click()
              cy.contains('invalid, has expired or was already used')
              cy.contains('a', 'Request another link')
            })
          })
        })
    })
  })

  it('refuses an invalid link', () => {
    visitInEnglish('/forgot-password?token=invalid')
    cy.get('input[type=password]').eq(0).type('another-password')
    cy.get('input[type=password]').eq(1).type('another-password')
    cy.get('button[type=submit]').click()
    cy.contains('invalid, has expired or was already used')
  })
})
