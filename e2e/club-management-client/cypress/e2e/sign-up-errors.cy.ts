import { firstMessage, readLinkPath, resetNetworkLimits, uniqueEmail, visitInEnglish, waitForMessages } from '../support/helpers'

describe('Sign-up errors', () => {
  beforeEach(() => {
    resetNetworkLimits()
  })

  it('validates the fields without calling the API', () => {
    cy.intercept('POST', '/api/auth/register').as('register')
    visitInEnglish('/signup')
    cy.contains('button', 'Create account').click()
    cy.contains('This field is required.')
    cy.get('input[type=email]').type('nope')
    cy.get('input[type=password]').eq(0).type('short')
    cy.get('input[type=password]').eq(1).type('other')
    cy.contains('button', 'Create account').click()
    cy.contains('Enter a valid email.')
    cy.contains('The password must have at least 8 characters.')
    cy.contains('The passwords do not match.')
    cy.get('@register.all').should('have.length', 0)
  })

  it('refuses an account type in the request', () => {
    cy.request({
      method: 'POST',
      url: '/api/auth/register',
      body: { name: 'Ana', email: uniqueEmail(), password: 'brand-new-password', type: 'ADMIN' },
      failOnStatusCode: false,
    })
      .its('status')
      .should('eq', 400)
  })

  it('refuses a used verification link and offers a new one', () => {
    const email = uniqueEmail('used-link')
    cy.request('POST', '/api/auth/register', { name: 'Ana', email, password: 'brand-new-password', language: 'en' })
    waitForMessages(email, 1).then((messages) => {
      readLinkPath(firstMessage(messages).ID, '/verify-email').then(({ path }) => {
        visitInEnglish(path)
        cy.contains('Email confirmed.')
        visitInEnglish(path)
        cy.contains('This link is invalid, has expired or was already used.')
        cy.contains('button', 'Resend link')
      })
    })
  })

  it('refuses an unknown verification link', () => {
    visitInEnglish('/verify-email?token=unknown')
    cy.contains('This link is invalid, has expired or was already used.')
  })

  it('limits sign-ups to 10 per hour per network', () => {
    const register = () =>
      cy.request({
        method: 'POST',
        url: '/api/auth/register',
        body: { name: 'Ana', email: uniqueEmail('limit'), password: 'brand-new-password' },
        failOnStatusCode: false,
      })

    Cypress._.times(10, () => register().its('status').should('eq', 202))
    register().then((response) => {
      expect(response.status).to.equal(429)
      expect(response.body).to.deep.equal({ error: 'too_many_requests' })
    })
    resetNetworkLimits()
  })
})
