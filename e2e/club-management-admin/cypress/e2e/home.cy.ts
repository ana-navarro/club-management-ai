describe('Home', () => {
  it('shows the application title', () => {
    cy.visit('/')
    cy.contains('h1', 'Club Management Admin').should('be.visible')
  })
})
