import { visitInEnglish } from '../support/helpers'

describe('Admin login without sign-up or social login', () => {
  it('has no sign-up, Google or Facebook option', () => {
    visitInEnglish('/login')
    cy.contains('h1', 'Sign in')
    cy.get('a, button').each(($element) => {
      expect($element.text().toLowerCase()).to.not.match(/sign up|register|create account|cadastr|google|facebook/)
    })
  })

  it('has no sign-up page', () => {
    visitInEnglish('/signup')
    cy.location('pathname').should('eq', '/login')
  })

  it('refuses a sign-up through its API', () => {
    cy.request({
      method: 'POST',
      url: '/api/auth/register',
      body: { name: 'Ana', email: 'someone@club-management.local', password: 'brand-new-password' },
      failOnStatusCode: false,
    })
      .its('status')
      .should('be.oneOf', [404, 405])
  })
})
