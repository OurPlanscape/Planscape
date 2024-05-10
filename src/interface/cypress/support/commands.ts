import { urls, baseURL, testPass, testUser } from '../support/util';

declare namespace Cypress {
  interface Chainable {
    doLogin(user: string, pass: string): void;
    doLogout(): void;
    envCheck(): void;
  }
}

Cypress.Commands.add('doLogin', (user: string, pass: string) => {
  cy.visit(urls.LOGIN);
  cy.get('[formControlName="email"]').type(user);
  cy.get('[formControlName="password"]').type(pass);
  cy.get('button[type="submit"]').click();
});

Cypress.Commands.add('doLogout', () => {
  cy.get('button[data-id="menu-trigger"]').click();
  cy.get('button[data-id="logout"]').click();
});

Cypress.Commands.add('envCheck', () => {
  if (!baseURL) {
    throw new Error('Base Url is not defined');
  }
  if (!testUser) {
    throw new Error('testUser is not defined');
  }
  if (!testPass) {
    throw new Error('Base Url is not defined');
  }
});
