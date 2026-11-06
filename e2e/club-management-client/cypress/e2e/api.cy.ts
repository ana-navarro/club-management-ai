describe('API', () => {
  it('reaches the BFF through the gateway', () => {
    cy.request('/api/health').its('body').should('deep.equal', { status: 'ok' })
  })
})
