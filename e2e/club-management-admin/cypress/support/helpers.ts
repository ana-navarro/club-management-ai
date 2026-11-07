export const ADMIN_EMAIL = 'admin@club-management.local'
export const ADMIN_PASSWORD = 'development-only-password'
export const MAILPIT = 'http://127.0.0.1:8025'

// Creates an account for one test, so tests do not disturb each other.
export const createAccount = (password = 'initial-password') => {
  const email = `user-${Date.now()}-${Math.floor(Math.random() * 100000)}@club-management.local`
  cy.task(
    'composeExec',
    {
      service: 'users-svc',
      env: { SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: password },
      command: ['npx', 'tsx', 'src/seed.ts'],
    },
    { log: false, timeout: 120000 },
  )
  return cy.wrap(email, { log: false })
}

export const setEnglish = () => {
  cy.window({ log: false }).then((win) => win.sessionStorage.setItem('language', 'en'))
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

type MailpitMessage = { ID: string; Subject: string; To: { Address: string }[] }

export const messagesTo = (email: string) =>
  cy
    .request<{ messages: MailpitMessage[] }>(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)
    .then((response) => response.body.messages)

export const waitForMessages = (email: string, count: number, attempts = 20): Cypress.Chainable<MailpitMessage[]> =>
  messagesTo(email).then((messages) => {
    if (messages.length >= count || attempts === 0) return messages
    return cy.wait(500, { log: false }).then(() => waitForMessages(email, count, attempts - 1))
  })

export const readResetPath = (id: string) =>
  cy.request<{ Text: string }>(`${MAILPIT}/api/v1/message/${id}`).then((response) => {
    const match = /\/forgot-password\?token=[^\s]+/.exec(response.body.Text)
    if (!match) throw new Error('No link in the email')
    return match[0]
  })

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
