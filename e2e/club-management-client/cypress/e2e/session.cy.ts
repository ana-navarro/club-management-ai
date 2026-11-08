import { createClientAccount, readSessionToken, signIn, visitInEnglish } from '../support/helpers'

const MINUTE = 60 * 1000
// The simulated clock stands still, while the backend counts from the real time of the login.
const MARGIN = 2 * MINUTE
const CLOCK_METHODS: ('Date' | 'setTimeout' | 'clearTimeout')[] = ['Date', 'setTimeout', 'clearTimeout']

let email = ''

const signInWithClock = () => {
  cy.clock(Date.now(), CLOCK_METHODS)
  visitInEnglish('/login')
  cy.tick(100)
  signIn(email, 'initial-password')
  cy.contains('Hello, Client')
}

describe('Session', () => {
  beforeEach(() => {
    createClientAccount().then((created) => {
      email = created
    })
  })

  it('renews with activity near the expiry, with a different token', () => {
    cy.intercept('POST', '/api/auth/refresh').as('refresh')
    signInWithClock()
    cy.window().then((win) => {
      const before = readSessionToken(win)
      cy.tick(95 * MINUTE)
      cy.get('h1').click()
      cy.wait('@refresh').its('response.statusCode').should('eq', 200)
      cy.window().should((current) => {
        expect(readSessionToken(current)).to.not.equal(before)
      })
      cy.location('pathname').should('eq', '/')
    })
  })

  it('ends when idle for 2 hours, with a notice', () => {
    signInWithClock()
    cy.tick(120 * MINUTE + MARGIN)
    cy.location('pathname').should('eq', '/login')
    cy.contains('Your session has expired. Sign in again.')
    cy.window().its('sessionStorage').invoke('getItem', 'session').should('equal', null)
  })

  it('makes no call at the session limit and ends at the expiry', () => {
    cy.intercept('POST', '/api/auth/refresh').as('refresh')
    cy.clock(Date.now(), CLOCK_METHODS)
    visitInEnglish('/login')
    cy.tick(100)
    cy.intercept('POST', '/api/auth/login', (request) => {
      request.continue((response) => {
        response.body.renewAt = response.body.expiresAt
      })
    })
    signIn(email, 'initial-password')
    cy.contains('Hello, Client')
    cy.tick(100 * MINUTE)
    cy.get('h1').click()
    cy.get('@refresh.all').should('have.length', 0)
    cy.tick(20 * MINUTE + MARGIN)
    cy.location('pathname').should('eq', '/login')
  })

  it('leaves the app when the backend refuses the token', () => {
    cy.intercept('GET', '/api/users/me', { statusCode: 401, body: { error: 'invalid_token' } })
    visitInEnglish('/login')
    signIn(email, 'initial-password')
    cy.location('pathname').should('eq', '/login')
    cy.contains('Your session has expired.')
  })
})
