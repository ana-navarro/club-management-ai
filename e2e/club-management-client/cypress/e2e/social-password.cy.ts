import {
  firstMessage,
  readResetPath,
  resetNetworkLimits,
  signIn,
  signInWithProvider,
  signOut,
  uniqueEmail,
  visitInEnglish,
  waitForMessages,
} from '../support/helpers'

describe('Password on an account created by a provider', () => {
  beforeEach(() => {
    resetNetworkLimits()
  })

  it('has no password until the reset sets one, and then both ways work', () => {
    const email = uniqueEmail('social-password')
    signInWithProvider('Google', { email, name: 'Ana' })
    cy.location('pathname').should('eq', '/')
    signOut()

    // Without a password, the login answers like any wrong password.
    visitInEnglish('/login')
    signIn(email, 'any-password')
    cy.get('[role=alert]').should('contain', 'Invalid email or password')

    cy.request('POST', '/api/auth/forgot-password', { email, language: 'en' })
    waitForMessages(email, 1).then((messages) => {
      readResetPath(firstMessage(messages).ID).then((path) => {
        visitInEnglish(path)
        cy.get('input[type=password]').eq(0).type('brand-new-password')
        cy.get('input[type=password]').eq(1).type('brand-new-password')
        cy.get('button[type=submit]').click()
        cy.location('pathname').should('eq', '/login')

        signIn(email, 'brand-new-password')
        cy.location('pathname').should('eq', '/')
        signOut()
        signInWithProvider('Google', { email })
        cy.location('pathname').should('eq', '/')
      })
    })
  })
})
