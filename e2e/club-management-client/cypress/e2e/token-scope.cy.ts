import { ADMIN_EMAIL, ADMIN_PASSWORD, createClientAccount } from '../support/helpers'

const ADMIN_APP = 'http://127.0.0.1:8081'

describe('Token scope', () => {
  it('refuses a client token in the admin system', () => {
    createClientAccount().then((email) => {
      cy.request('POST', '/api/auth/login', { email, password: 'initial-password' })
        .its('body.token')
        .then((token) => {
          cy.request({
            url: `${ADMIN_APP}/api/users/me`,
            headers: { Authorization: `Bearer ${token}` },
            failOnStatusCode: false,
          })
            .its('status')
            .should('eq', 401)
        })
    })
  })

  it('refuses an admin token in the client system', () => {
    cy.request('POST', `${ADMIN_APP}/api/auth/login`, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .its('body.token')
      .then((token) => {
        cy.request({ url: '/api/users/me', headers: { Authorization: `Bearer ${token}` }, failOnStatusCode: false })
          .its('status')
          .should('eq', 401)
      })
  })

  it('refuses a client account in the admin login', () => {
    createClientAccount().then((email) => {
      cy.request({
        method: 'POST',
        url: `${ADMIN_APP}/api/auth/login`,
        body: { email, password: 'initial-password' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(401)
        expect(response.body).to.deep.equal({ error: 'invalid_credentials' })
      })
    })
  })
})
