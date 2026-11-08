import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  createClientAccount,
  readSessionToken,
  signIn,
  visitInEnglish,
} from '../support/helpers'

describe('Login', () => {
  ;['/', '/anything/else'].forEach((path) => {
    it(`redirects ${path} to the login without a token`, () => {
      visitInEnglish(path)
      cy.location('pathname').should('eq', '/login')
      cy.contains('h1', 'Sign in')
    })
  })

  it('signs in a client, keeping the token out of the URL', () => {
    createClientAccount().then((email) => {
      visitInEnglish('/login')
      signIn(email, 'initial-password')
      cy.location('pathname').should('eq', '/')
      cy.location('href').should('not.contain', 'token')
      cy.window().then((win) => {
        expect(readSessionToken(win)).to.be.a('string')
      })
      cy.visit('/login')
      cy.location('pathname').should('eq', '/')
    })
  })

  it('gives each login its own token, and both sessions work at once', () => {
    createClientAccount().then((email) => {
      const login = () =>
        cy.request('POST', '/api/auth/login', { email, password: 'initial-password' }).its('body.token')
      login().then((first) => {
        login().then((second) => {
          expect(first).to.not.equal(second)
          ;[first, second].forEach((token) => {
            cy.request({ url: '/api/users/me', headers: { Authorization: `Bearer ${token}` } })
              .its('body.type')
              .should('eq', 'CLIENT')
          })
        })
      })
    })
  })

  it('shows a generic message for a wrong password', () => {
    createClientAccount().then((email) => {
      visitInEnglish('/login')
      signIn(email, 'wrong-password')
      cy.get('[role=alert]').should('contain', 'Invalid email or password')
      cy.location('pathname').should('eq', '/login')
    })
  })

  it('shows the same message for an administrator account', () => {
    visitInEnglish('/login')
    signIn(ADMIN_EMAIL, ADMIN_PASSWORD)
    cy.get('[role=alert]').should('contain', 'Invalid email or password')
    cy.location('pathname').should('eq', '/login')
  })

  it('shows the same message for an unknown account', () => {
    visitInEnglish('/login')
    signIn('nobody@club-management.local', 'wrong-password')
    cy.get('[role=alert]').should('contain', 'Invalid email or password')
  })

  it('validates the fields without calling the API', () => {
    cy.intercept('POST', '/api/auth/login').as('login')
    visitInEnglish('/login')
    cy.get('button[type=submit]').click()
    cy.contains('This field is required.')
    cy.get('input[type=email]').type('nope')
    cy.get('button[type=submit]').click()
    cy.contains('Enter a valid email.')
    cy.get('@login.all').should('have.length', 0)
  })
})
