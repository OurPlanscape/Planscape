describe('Login', () => {
  it('Logins user and redirects to home', () => {
    cy.login();
    cy.location('pathname').should('eq', '/home');
  });
});
