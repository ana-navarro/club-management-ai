import { visitInEnglish } from '../support/helpers'

const expectNoHorizontalScroll = () => {
  cy.document().then((doc) => {
    expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth)
  })
}

describe('Responsive layout', () => {
  ;[
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
  ].forEach(({ width, height }) => {
    ;['/login', '/forgot-password', '/forgot-password?token=x'].forEach((path) => {
      it(`has no horizontal scroll on ${path} at ${width} px`, () => {
        cy.viewport(width, height)
        visitInEnglish(path)
        cy.get('h1').should('be.visible')
        cy.get('button[type=submit]').should('be.visible')
        expectNoHorizontalScroll()
      })
    })
  })
})
