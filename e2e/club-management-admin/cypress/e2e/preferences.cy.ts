import { ADMIN_EMAIL, ADMIN_PASSWORD, createAccount, signIn, visitInEnglish } from '../support/helpers'

const expectBackground = (color: string) => {
  cy.get('body').should('have.css', 'background-color', color)
}

describe('Preferences', () => {
  it('switches the language and keeps it after a reload', () => {
    visitInEnglish('/login')
    cy.contains('h1', 'Sign in')
    cy.get('input[type=checkbox]').eq(0).click({ force: true })
    cy.contains('h1', 'Entrar')
    cy.window().its('sessionStorage').invoke('getItem', 'language').should('eq', 'pt-BR')
    cy.reload()
    cy.contains('h1', 'Entrar')
    cy.contains('Esqueci a senha')
  })

  it('switches the theme and keeps it after a reload', () => {
    visitInEnglish('/login')
    cy.get('input[type=checkbox]').eq(1).then(($input) => {
      if ($input.prop('checked')) cy.wrap($input).click({ force: true })
    })
    expectBackground('rgb(238, 238, 238)')
    cy.get('input[type=checkbox]').eq(1).click({ force: true })
    expectBackground('rgb(7, 27, 43)')
    cy.window().its('sessionStorage').invoke('getItem', 'theme').should('eq', 'dark')
    cy.reload()
    expectBackground('rgb(7, 27, 43)')
    cy.window().its('localStorage').invoke('getItem', 'theme').should('equal', null)
  })

  it('follows the browser when the new session has no choice', () => {
    cy.visit('/login', {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, 'language', { value: 'pt-BR' })
      },
    })
    cy.contains('h1', 'Entrar')
  })

  it('saves the session choices on a user who has none, and restores them in a new session', () => {
    createAccount().then((email) => {
      cy.visit('/login', {
        onBeforeLoad(win) {
          win.sessionStorage.setItem('language', 'en')
          win.sessionStorage.setItem('theme', 'dark')
        },
      })
      signIn(email, 'initial-password')
      cy.location('pathname').should('eq', '/')

      cy.window().then((win) => win.sessionStorage.clear())
      cy.visit('/login', {
        onBeforeLoad(win) {
          win.sessionStorage.setItem('language', 'pt-BR')
          win.sessionStorage.setItem('theme', 'light')
        },
      })
      signIn(email, 'initial-password')
      cy.location('pathname').should('eq', '/')
      cy.contains('Hello, Admin')
      expectBackground('rgb(7, 27, 43)')
    })
  })

  it('saves changes made while signed in', () => {
    cy.intercept('PATCH', '/api/users/me/preferences').as('save')
    visitInEnglish('/login')
    signIn(ADMIN_EMAIL, ADMIN_PASSWORD)
    cy.location('pathname').should('eq', '/')
    cy.get('input[type=checkbox]').eq(1).click({ force: true })
    cy.wait('@save').its('response.statusCode').should('eq', 200)
  })
})
