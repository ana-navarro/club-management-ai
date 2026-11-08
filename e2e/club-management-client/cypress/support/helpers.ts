export const ADMIN_EMAIL = 'admin@club-management.local'
export const ADMIN_PASSWORD = 'development-only-password'
export const MAILPIT = 'http://127.0.0.1:8025'

// Kept short: Cypress types very fast, and with React 19 a very long text in one field can exceed
// the limit of nested updates (also true in the admin app), which a person typing never reaches.
export const uniqueEmail = (prefix = 'client') =>
  `${prefix.slice(0, 8)}-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}@club-management.local`

// Creates a confirmed client account for one test, so tests do not disturb each other.
export const createClientAccount = (password = 'initial-password') => {
  const email = uniqueEmail()
  cy.task(
    'composeExec',
    {
      service: 'users-svc',
      env: { SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: password, SEED_USER_TYPE: 'CLIENT' },
      command: ['npx', 'tsx', 'src/seed.ts'],
    },
    { log: false, timeout: 120000 },
  )
  return cy.wrap(email, { log: false })
}

export const visitInEnglish = (path: string) => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.sessionStorage.setItem('language', 'en')
    },
  })
}

export const signIn = (email: string, password: string) => {
  cy.get('input[type=email]').clear().type(email)
  cy.get('input[type=password]').clear().type(password, { log: false })
  cy.get('button[type=submit]').click()
}

export type MailpitMessage = { ID: string; Subject: string; To: { Address: string }[] }

export const messagesTo = (email: string) =>
  cy
    .request<{ messages: MailpitMessage[] }>(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)
    .then((response) => response.body.messages)

export const waitForMessages = (email: string, count: number, attempts = 20): Cypress.Chainable<MailpitMessage[]> =>
  messagesTo(email).then((messages) => {
    if (messages.length >= count || attempts === 0) return messages
    return cy.wait(500, { log: false }).then(() => waitForMessages(email, count, attempts - 1))
  })

export const readMessageText = (id: string) =>
  cy.request<{ Text: string }>(`${MAILPIT}/api/v1/message/${id}`).then((response) => response.body.Text)

// Reads the link with the given path from an email, keeping only the path and the query.
export const readLinkPath = (id: string, path: string) =>
  readMessageText(id).then((text) => {
    const escaped = path.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
    const match = new RegExp(String.raw`(https?://[^\s/]+)(` + escaped + String.raw`\?token=[^\s]+)`).exec(text)
    if (!match) throw new Error(`No ${path} link in the email`)
    return { origin: match[1] ?? '', path: match[2] ?? '' }
  })

export const readResetPath = (id: string) => readLinkPath(id, '/forgot-password').then((link) => link.path)

export const firstMessage = (messages: MailpitMessage[]): MailpitMessage => {
  const [message] = messages
  if (!message) throw new Error('Expected an email')
  return message
}

export const readTokenFromPath = (path: string): string => {
  const token = new URL(path, 'http://localhost').searchParams.get('token')
  if (!token) throw new Error('No token in the link')
  return token
}

export const readSessionToken = (win: Window): string => {
  const raw = win.sessionStorage.getItem('session')
  if (!raw) throw new Error('Expected a session')
  const session: { token: string } = JSON.parse(raw)
  return session.token
}

// Every request from the test runner counts for the same network, so the specs that sign up
// clear the limits per network first, or a full run would hit them.
export const resetNetworkLimits = () => {
  cy.task(
    'composeExec',
    {
      service: 'mongo',
      command: [
        'mongosh',
        '--quiet',
        'ranking-svc',
        '--eval',
        'db.registrationAttempts.deleteMany({}); db.socialLinkAttempts.deleteMany({})',
      ],
    },
    { log: false, timeout: 120000 },
  )
}

export const MOCK_PROVIDER = 'http://localhost:8090'

export type MockIdentity = {
  email: string
  name?: string
  subject?: string
  emailVerified?: boolean
  noEmail?: boolean
  cancel?: boolean
}

// Fills the form of the mock provider, as a person would at Google or Facebook.
export const confirmAtMockProvider = (identity: MockIdentity) => {
  cy.origin(MOCK_PROVIDER, { args: identity }, (args) => {
    cy.get('#email').clear().type(args.email)
    if (args.name) cy.get('#name').clear().type(args.name)
    if (args.subject) cy.get('#subject').type(args.subject)
    if (args.emailVerified === false) cy.get('#email_verified').uncheck()
    if (args.noEmail) cy.get('#no_email').check()
    cy.get(`button[value=${args.cancel ? 'cancel' : 'confirm'}]`).click()
  })
}

// Signs in through the provider buttons of the login page.
export const signInWithProvider = (provider: 'Google' | 'Facebook', identity: MockIdentity) => {
  visitInEnglish('/login')
  cy.contains('a', `Continue with ${provider}`).click()
  confirmAtMockProvider(identity)
}

// Follows the same redirects as the browser, but with requests, to inspect each step.
export const startSocialLoginByRequest = (provider: 'google' | 'facebook') =>
  cy.request({ url: `/api/auth/${provider}/start?language=en`, followRedirect: false }).then((response) => {
    expect(response.status).to.equal(302)
    return new URL(String(response.headers.location))
  })

export const confirmAtMockByRequest = (authorizeUrl: URL, identity: MockIdentity) =>
  cy
    .request({
      method: 'POST',
      url: authorizeUrl.toString(),
      form: true,
      followRedirect: false,
      body: {
        ...Object.fromEntries(authorizeUrl.searchParams),
        action: identity.cancel ? 'cancel' : 'confirm',
        email: identity.email,
        name: identity.name ?? 'Mock Person',
        subject: identity.subject ?? '',
        ...(identity.emailVerified === false ? {} : { email_verified: 'true' }),
        ...(identity.noEmail ? { no_email: 'true' } : {}),
      },
    })
    .then((response) => new URL(String(response.headers.location)))

export const followCallback = (callbackUrl: URL) =>
  cy
    .request({ url: callbackUrl.pathname + callbackUrl.search, followRedirect: false })
    .then((response) => String(response.headers.location))

// Changes stored dates, to test what a real wait would show, like an expired link.
export const runInDatabase = (script: string) => {
  cy.task(
    'composeExec',
    { service: 'mongo', command: ['mongosh', '--quiet', 'ranking-svc', '--eval', script] },
    { log: false, timeout: 120000 },
  )
}

export const readSocialLinkPath = (email: string, count = 1) =>
  waitForMessages(email, count).then((messages) => {
    expect(messages).to.have.length(count)
    return readLinkPath(firstMessage(messages).ID, '/confirm-social-link').then((link) => link.path)
  })

// Waits for the session, because right after a sign in the app may still be storing it.
export const readCurrentUserId = () =>
  cy
    .window()
    .should((win) => {
      expect(win.sessionStorage.getItem('session'), 'session').to.be.a('string')
    })
    .then((win) =>
    cy
      .request({ url: '/api/users/me', headers: { Authorization: `Bearer ${readSessionToken(win)}` } })
      .its('body.id'),
  )

export const signOut = () => {
  cy.window().then((win) => win.sessionStorage.removeItem('session'))
}
