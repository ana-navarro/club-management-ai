import { visitInEnglish } from '../support/helpers'

const expectNoHorizontalScroll = () => {
  cy.document().then((doc) => {
    expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth)
  })
}

// Light and dark page backgrounds, derived from the client palette (research R15).
const BACKGROUND = { light: 'rgb(244, 247, 247)', dark: 'rgb(22, 41, 45)' }
const PAGES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/forgot-password?token=x',
  '/verify-email?token=unknown',
  '/confirm-social-link?token=unknown',
]

describe('Responsive layout and palette', () => {
  ;[
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
  ].forEach(({ width, height }) => {
    ;(['light', 'dark'] as const).forEach((theme) => {
      ;['en', 'pt-BR'].forEach((language) => {
        PAGES.forEach((path) => {
          it(`shows ${path} at ${width} px, ${theme}, ${language}, without horizontal scroll`, () => {
            cy.viewport(width, height)
            cy.visit(path, {
              onBeforeLoad(win) {
                win.sessionStorage.setItem('language', language)
                win.sessionStorage.setItem('theme', theme)
              },
            })
            cy.get('h1').should('be.visible')
            cy.get('body').should('have.css', 'background-color', BACKGROUND[theme])
            cy.get('html').should('have.attr', 'lang').and('not.be.empty')
            expectNoHorizontalScroll()
          })
        })
      })
    })
  })

  it('uses the orange of the palette on the sign-up button', () => {
    visitInEnglish('/login')
    cy.contains('a', 'Create account').should('have.css', 'background-color', 'rgb(255, 154, 0)')
  })
})
