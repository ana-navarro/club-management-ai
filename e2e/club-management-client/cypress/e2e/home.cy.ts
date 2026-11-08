import { createClientAccount, signIn, visitInEnglish } from '../support/helpers'

describe('Home', () => {
  it('is protected and shows the application title after signing in', () => {
    visitInEnglish('/')
    cy.location('pathname').should('eq', '/login')
    createClientAccount().then((email) => {
      signIn(email, 'initial-password')
      cy.location('pathname').should('eq', '/')
      cy.contains('h1', 'Club Management').should('be.visible')
      cy.contains('Hello, Client').should('be.visible')
    })
  })
})
