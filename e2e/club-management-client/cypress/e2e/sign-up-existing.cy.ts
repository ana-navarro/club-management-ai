import { createClientAccount, resetNetworkLimits, signIn, visitInEnglish, waitForMessages } from '../support/helpers'

describe('Sign-up with an existing email', () => {
  beforeEach(() => {
    resetNetworkLimits()
  })

  it('shows the same message, warns the owner and creates no account', () => {
    createClientAccount().then((email) => {
      visitInEnglish('/signup')
      cy.get('input[autocomplete=name]').type('Someone')
      cy.get('input[type=email]').type(email.toUpperCase())
      cy.get('input[type=password]').eq(0).type('another-password')
      cy.get('input[type=password]').eq(1).type('another-password')
      cy.contains('button', 'Create account').click()
      cy.contains('h1', 'Check your email')

      waitForMessages(email, 1).then((messages) => {
        expect(messages).to.have.length(1)
        expect(messages[0]?.Subject).to.equal('Sign-up attempt with your email')
      })

      // The original password still works, and the one from the attempt does not.
      visitInEnglish('/login')
      signIn(email, 'another-password')
      cy.get('[role=alert]').should('contain', 'Invalid email or password')
      signIn(email, 'initial-password')
      cy.location('pathname').should('eq', '/')
    })
  })

  it('answers the API the same way for a new and an existing email', () => {
    createClientAccount().then((existing) => {
      const body = { name: 'Ana', password: 'brand-new-password' }
      cy.request('POST', '/api/auth/register', { ...body, email: existing }).then((first) => {
        cy.request('POST', '/api/auth/register', { ...body, email: `new-${Date.now()}@club-management.local` }).then(
          (second) => {
            expect(first.status).to.equal(202)
            expect(second.status).to.equal(202)
            expect(first.body).to.deep.equal(second.body)
          },
        )
      })
    })
  })
})
