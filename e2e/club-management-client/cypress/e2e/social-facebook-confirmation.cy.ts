import {
  confirmAtMockByRequest,
  confirmAtMockProvider,
  followCallback,
  readCurrentUserId,
  readSocialLinkPath,
  resetNetworkLimits,
  runInDatabase,
  signInWithProvider,
  signOut,
  startSocialLoginByRequest,
  uniqueEmail,
  visitInEnglish,
  waitForMessages,
} from '../support/helpers'

// Facebook does not verify the email, so its first entry waits for a confirmation (spec FR-014c).
const facebookEntryByRequest = (email: string, subject?: string) =>
  startSocialLoginByRequest('facebook').then((authorizeUrl) =>
    confirmAtMockByRequest(authorizeUrl, { email, name: 'Ana FB', subject }).then(followCallback),
  )

// The 1 minute limit keeps the first link valid. Moving the request back in time stands for the wait.
const olderThanAMinute = (email: string) =>
  runInDatabase(
    `db.socialLinkRequests.updateMany({ email: '${email}' }, { $set: { createdAt: new Date(Date.now() - 120000) } })`,
  )

describe('Facebook email confirmation', () => {
  beforeEach(() => {
    resetNetworkLimits()
  })

  it('creates nothing and opens no session before the confirmation, and opening the link confirms nothing', () => {
    const email = uniqueEmail('fb-new')
    facebookEntryByRequest(email).should('eq', '/login?social_notice=check_email')
    readSocialLinkPath(email).then((path) => {
      visitInEnglish(path)
      cy.contains('Link the Facebook profile "Ana FB" to the account')
      cy.reload()
      cy.contains('Link the Facebook profile "Ana FB" to the account')
      // Still pending: the next entry asks again, without a new email inside the minute.
      facebookEntryByRequest(email).should('eq', '/login?social_notice=check_email')
    })
  })

  it('declines without linking anything, and the link stops working', () => {
    const email = uniqueEmail('fb-decline')
    facebookEntryByRequest(email)
    readSocialLinkPath(email).then((path) => {
      visitInEnglish(path)
      cy.contains('button', 'This was not me').click()
      cy.contains('Request declined. Nothing was linked to your account.')
      visitInEnglish(path)
      cy.contains('This link is invalid, has expired or was already used.')
      facebookEntryByRequest(email).should('eq', '/login?social_notice=check_email')
    })
  })

  it('keeps the first link inside the minute, and a later request replaces it', () => {
    const email = uniqueEmail('fb-again')
    facebookEntryByRequest(email)
    readSocialLinkPath(email).then((firstPath) => {
      facebookEntryByRequest(email)
      cy.wait(1500)
      waitForMessages(email, 2, 0).should('have.length', 1)

      olderThanAMinute(email)
      facebookEntryByRequest(email)
      readSocialLinkPath(email, 2).then((secondPath) => {
        expect(secondPath).to.not.equal(firstPath)
        visitInEnglish(firstPath)
        cy.contains('This link is invalid, has expired or was already used.')
        visitInEnglish(secondPath)
        cy.contains('button', 'Confirm')
      })
    })
  })

  it('refuses an expired link', () => {
    const email = uniqueEmail('fb-expired')
    facebookEntryByRequest(email)
    readSocialLinkPath(email).then((path) => {
      runInDatabase(`db.socialLinkRequests.updateMany({ email: '${email}' }, { $set: { expiresAt: new Date(Date.now() - 1000) } })`)
      visitInEnglish(path)
      cy.contains('This link is invalid, has expired or was already used.')
    })
  })

  it('replaces the linked Facebook profile with another one of the same email, after the confirmation', () => {
    const email = uniqueEmail('fb-replace')
    // Unique per run, so a profile linked in an earlier run does not enter another account.
    const first = `first-${email}`
    const second = `second-${email}`
    signInWithProvider('Google', { email })
    cy.location('pathname').should('eq', '/')
    readCurrentUserId().then((accountId) => {
      signOut()
      facebookEntryByRequest(email, first)
      readSocialLinkPath(email).then((path) => {
        visitInEnglish(path)
        cy.contains('button', 'Confirm').click()
        cy.contains('Facebook linked to your account.')
      })

      olderThanAMinute(email)
      facebookEntryByRequest(email, second).should('eq', '/login?social_notice=check_email')
      readSocialLinkPath(email, 2).then((path) => {
        visitInEnglish(path)
        cy.contains('button', 'Confirm').click()
        cy.contains('Facebook linked to your account.')
        cy.contains('a', 'Continue with Facebook').click()
        confirmAtMockProvider({ email, subject: second })
        cy.location('pathname').should('eq', '/')
        readCurrentUserId().should('eq', accountId)
      })

      // The first profile is no longer linked, so it waits for a confirmation again.
      olderThanAMinute(email)
      facebookEntryByRequest(email, first).should('eq', '/login?social_notice=check_email')
    })
  })
})
