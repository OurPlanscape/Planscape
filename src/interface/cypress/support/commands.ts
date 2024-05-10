import { urls, baseURL } from "../support/util";
declare namespace Cypress {
  interface Chainable {
    doLogin(user: string, pass: string): void;
    doLogout(): void;
  }
}

Cypress.Commands.add('doLogin', (user : string, pass : string) => {
  cy.visit(baseURL + urls.LOGIN);
  cy.get('[formControlName="email"]').type(user);
  cy.get('[formControlName="password"]').type(pass);
  cy.get('button[type="submit"]').click();
});

Cypress.Commands.add('doLogout', () => {
    cy.get('button[data-id="menu-trigger"]').click();
    cy.get('button[data-id="logout"]').click();
});

