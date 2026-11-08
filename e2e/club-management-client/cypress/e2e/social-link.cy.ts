import {
  confirmAtMockProvider,
  createClientAccount,
  readCurrentUserId,
  readSocialLinkPath,
  resetNetworkLimits,
  signIn,
  signInWithProvider,
  signOut,
  uniqueEmail,
  visitInEnglish,
} from '../support/helpers'

const login = (email: string, password: string) =>
  cy.request({ method: 'POST', url: '/api/auth/login', body: { email, password }, failOnStatusCode: false })

const signUpWithoutConfirming = (email: string) =>
  cy.request('POST', '/api/auth/register', { name: 'Someone', email, password: 'pre-registered', language: 'en' })

const confirmFacebookLink = (email: string) => {
  signInWithProvider('Facebook', { email })
  cy.contains('We sent a link to the email of your Facebook account')
  readSocialLinkPath(email).then((path) => {
    visitInEnglish(path)
    cy.contains('button', 'Confirm').click()
    cy.contains('Facebook linked to your account.')
  })
}

describe('Linking a provider to an existing account', () => {
  beforeEach(() => {
    resetNetworkLimits()
  })

  it('links Google to a password account, and both ways keep working', () => {
    createClientAccount().then((email) => {
      visitInEnglish('/login')
      signIn(email, 'initial-password')
      readCurrentUserId().then((accountId) => {
        signOut()
        signInWithProvider('Google', { email })
        cy.location('pathname').should('eq', '/')
        readCurrentUserId().should('eq', accountId)
        login(email, 'initial-password').its('status').should('eq', 200)
      })
    })
  })

  it('lets the email owner take an unconfirmed account with Google, and the old password stops working', () => {
    const email = uniqueEmail('claim-google')
    signUpWithoutConfirming(email)
    login(email, 'pre-registered').its('body').should('deep.equal', { error: 'email_not_verified' })

    signInWithProvider('Google', { email })
    cy.location('pathname').should('eq', '/')
    login(email, 'pre-registered').its('body').should('deep.equal', { error: 'invalid_credentials' })
  })

  it('links Facebook to a password account only after the confirmation', () => {
    createClientAccount().then((email) => {
      confirmFacebookLink(email)
      cy.contains('a', 'Continue with Facebook').click()
      confirmAtMockProvider({ email })
      cy.location('pathname').should('eq', '/')
      login(email, 'initial-password').its('status').should('eq', 200)
    })
  })

  it('lets the email owner take an unconfirmed account with Facebook after the confirmation', () => {
    const email = uniqueEmail('claim-facebook')
    signUpWithoutConfirming(email)
    signInWithProvider('Facebook', { email })
    cy.contains('We sent a link to the email of your Facebook account')
    // Before the confirmation, nothing changed.
    login(email, 'pre-registered').its('body').should('deep.equal', { error: 'email_not_verified' })

    readSocialLinkPath(email, 2).then((path) => {
      visitInEnglish(path)
      cy.contains('button', 'Confirm').click()
      cy.contains('Facebook linked to your account.')
      login(email, 'pre-registered').its('body').should('deep.equal', { error: 'invalid_credentials' })
    })
  })
})
