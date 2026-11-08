import {
  confirmAtMockProvider,
  readCurrentUserId,
  readSocialLinkPath,
  resetNetworkLimits,
  signInWithProvider,
  signOut,
  uniqueEmail,
  visitInEnglish,
} from '../support/helpers'

describe('Social login', () => {
  beforeEach(() => {
    resetNetworkLimits()
  })

  it('creates a confirmed account with Google and enters the same account again', () => {
    const email = uniqueEmail('google')
    signInWithProvider('Google', { email, name: 'Ana Google' })
    cy.location('pathname').should('eq', '/')
    cy.location('hash').should('eq', '')
    cy.contains('Hello, Ana Google')

    readCurrentUserId().then((firstId) => {
      signOut()
      signInWithProvider('Google', { email })
      cy.location('pathname').should('eq', '/')
      readCurrentUserId().should('eq', firstId)
    })
  })

  it('reaches the same account with Facebook only after the email confirmation, then directly', () => {
    const email = uniqueEmail('both')
    signInWithProvider('Google', { email, name: 'Ana' })
    cy.location('pathname').should('eq', '/')

    readCurrentUserId().then((accountId) => {
      signOut()
      signInWithProvider('Facebook', { email, name: 'Ana FB' })
      cy.location('pathname').should('eq', '/login')
      cy.contains('We sent a link to the email of your Facebook account')
      cy.window().its('sessionStorage').invoke('getItem', 'session').should('equal', null)

      readSocialLinkPath(email).then((path) => {
        visitInEnglish(path)
        cy.contains('Link the Facebook profile "Ana FB" to the account')
        cy.contains('button', 'Confirm').click()
        cy.contains('Facebook linked to your account.')
        cy.contains('a', 'Continue with Facebook').click()
        confirmAtMockProvider({ email, name: 'Ana FB' })
        cy.location('pathname').should('eq', '/')
        readCurrentUserId().should('eq', accountId)

        // Once linked, Facebook enters directly, without another email.
        signOut()
        signInWithProvider('Facebook', { email })
        cy.location('pathname').should('eq', '/')
        readSocialLinkPath(email, 1)
      })
    })
  })

  it('works in the 1280 px layout too', () => {
    cy.viewport(1280, 800)
    signInWithProvider('Google', { email: uniqueEmail('desktop') })
    cy.location('pathname').should('eq', '/')
  })
})
