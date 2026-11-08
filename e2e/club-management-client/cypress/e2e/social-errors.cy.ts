import {
  ADMIN_EMAIL,
  MOCK_PROVIDER,
  confirmAtMockByRequest,
  followCallback,
  resetNetworkLimits,
  signInWithProvider,
  startSocialLoginByRequest,
  uniqueEmail,
  waitForMessages,
} from '../support/helpers'

describe('Social login errors', () => {
  beforeEach(() => {
    resetNetworkLimits()
  })

  it('shows a clear message when the person cancels at the provider', () => {
    signInWithProvider('Google', { email: uniqueEmail(), cancel: true })
    cy.location('pathname').should('eq', '/login')
    cy.get('[role=alert]').should('contain', 'Sign-in was cancelled.')
    // The code leaves the address, so a reload does not show the message again.
    cy.location('search').should('eq', '')
  })

  it('asks for another option when Facebook sends no email', () => {
    signInWithProvider('Facebook', { email: uniqueEmail(), noEmail: true })
    cy.get('[role=alert]').should('contain', 'The provider did not share a verified email.')
  })

  it('refuses an unverified Google email', () => {
    signInWithProvider('Google', { email: uniqueEmail(), emailVerified: false })
    cy.get('[role=alert]').should('contain', 'The provider did not share a verified email.')
  })

  it('gives the generic error to an administrator email at Google', () => {
    signInWithProvider('Google', { email: ADMIN_EMAIL })
    cy.get('[role=alert]').should('contain', 'Invalid email or password.')
    cy.window().its('sessionStorage').invoke('getItem', 'session').should('equal', null)
  })

  it('gives the usual notice to an administrator email at Facebook, without sending anything', () => {
    signInWithProvider('Facebook', { email: ADMIN_EMAIL })
    cy.contains('We sent a link to the email of your Facebook account')
    cy.wait(1500)
    waitForMessages(ADMIN_EMAIL, 1, 0).then((messages) => {
      expect(messages.filter((message) => message.Subject.includes('Facebook'))).to.have.length(0)
    })
  })

  it('tells when the provider fails', () => {
    cy.request('POST', `${MOCK_PROVIDER}/control/fail-next`)
    signInWithProvider('Google', { email: uniqueEmail() })
    cy.get('[role=alert]').should('contain', 'We could not sign you in with the provider right now.')
  })

  it('refuses a return replayed with the same state, even with the cookie', () => {
    startSocialLoginByRequest('google').then((authorizeUrl) => {
      confirmAtMockByRequest(authorizeUrl, { email: uniqueEmail('replay') }).then((callbackUrl) => {
        cy.getCookie('oauth_binding').then((cookie) => {
          followCallback(callbackUrl).should('match', /^\/auth\/callback#code=/)
          if (cookie) cy.setCookie('oauth_binding', cookie.value, { path: '/api/auth/' })
          followCallback(callbackUrl).should('eq', '/login?social_error=invalid_state')
        })
      })
    })
  })

  it('refuses a return from another browser, without the cookie', () => {
    startSocialLoginByRequest('google').then((authorizeUrl) => {
      confirmAtMockByRequest(authorizeUrl, { email: uniqueEmail('no-cookie') }).then((callbackUrl) => {
        cy.clearCookie('oauth_binding')
        followCallback(callbackUrl).should('eq', '/login?social_error=invalid_state')
      })
    })
  })

  it('refuses a session code used twice', () => {
    startSocialLoginByRequest('google').then((authorizeUrl) => {
      confirmAtMockByRequest(authorizeUrl, { email: uniqueEmail('code') }).then((callbackUrl) => {
        followCallback(callbackUrl).then((location) => {
          const code = decodeURIComponent(location.split('#code=')[1] ?? '')
          cy.request('POST', '/api/auth/social/session', { code }).its('status').should('eq', 200)
          cy.request({ method: 'POST', url: '/api/auth/social/session', body: { code }, failOnStatusCode: false })
            .its('body')
            .should('deep.equal', { error: 'invalid_social_code' })
        })
      })
    })
  })
})
