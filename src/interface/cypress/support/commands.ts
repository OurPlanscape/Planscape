const testUser = {
  email: 'meh@ok.com',
  password: 'fdsfhdsifjdsfijds432423',
};

declare namespace Cypress {
  interface Chainable {
    doLogin(): void;
  }
}

Cypress.Commands.add('doLogin', () => {
  cy.visit('/login');
  cy.contains('Sign in to Planscape');
  cy.get('[formControlName="email"]').type(testUser.email);
  cy.get('[formControlName="password"]').type(testUser.password);
  cy.get('button[type="submit"]').click();
  // wait
  cy.contains('Planning areas').should('be.visible');

  cy.get('button[data-id="menu-trigger"]').click();
  cy.get('button[data-id="logout"]').click();
  // wait

  cy.contains('Welcome to Planscape').should('be.visible');
});

Cypress.Commands.addAll({
  doLogin() {},
});
