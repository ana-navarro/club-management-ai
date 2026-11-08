import { firstMessage, readLinkPath, resetNetworkLimits, signIn, uniqueEmail, visitInEnglish, waitForMessages } from '../support/helpers'

const fillSignUp = (email: string, password = 'brand-new-password') => {
  cy.get('input[autocomplete=name]').type('Ana')
  cy.get('input[type=email]').type(email)
  cy.get('input[type=password]').eq(0).type(password, { log: false })
  cy.get('input[type=password]').eq(1).type(password, { log: false })
  cy.contains('button', 'Create account').click()
}

describe('Sign-up', () => {
  beforeEach(() => {
    resetNetworkLimits()
  })

  it('creates an account that signs in only after confirming the email', () => {
    const email = uniqueEmail('signup')
    visitInEnglish('/login')
    cy.contains('a', 'Create account').click()
    cy.location('pathname').should('eq', '/signup')
    fillSignUp(email)
    cy.contains('h1', 'Check your email')
    cy.contains(`We sent a confirmation link to ${email}`)

    // Before confirming, the right password is not enough.
    visitInEnglish('/login')
    signIn(email, 'brand-new-password')
    cy.contains('Confirm your email before signing in')
    cy.location('pathname').should('eq', '/login')

    waitForMessages(email, 1).then((messages) => {
      expect(messages[0]?.Subject).to.equal('Confirm your email')
      readLinkPath(firstMessage(messages).ID, '/verify-email').then(({ origin, path }) => {
        expect(origin).to.equal('http://localhost:8080')
        visitInEnglish(path)
        cy.contains('Email confirmed. You can now sign in.')
        cy.contains('a', 'Go to sign in').click()
        signIn(email, 'brand-new-password')
        cy.location('pathname').should('eq', '/')
        cy.contains('Hello, Ana')
      })
    })
  })

  it('resends the link from the login notice, once per minute', () => {
    const email = uniqueEmail('resend')
    cy.request('POST', '/api/auth/register', { name: 'Ana', email, password: 'brand-new-password', language: 'en' })
    waitForMessages(email, 1).should('have.length', 1)

    visitInEnglish('/login')
    signIn(email, 'brand-new-password')
    cy.contains('button', 'Resend link').click()
    cy.contains('If the account still needs confirmation, we sent a new link.')
    // Inside the minute, nothing else is sent.
    cy.wait(1500)
    waitForMessages(email, 2, 0).should('have.length', 1)
  })
})
