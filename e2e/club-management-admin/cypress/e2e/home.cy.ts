import { ADMIN_EMAIL, ADMIN_PASSWORD, signIn, visitInEnglish } from '../support/helpers'

describe('Home', () => {
  it('shows the application title after signing in', () => {
    visitInEnglish('/login')
    signIn(ADMIN_EMAIL, ADMIN_PASSWORD)
    cy.location('pathname').should('eq', '/')
    cy.contains('h1', 'Club Management Admin').should('be.visible')
    cy.contains('Hello, Admin').should('be.visible')
  })
})
