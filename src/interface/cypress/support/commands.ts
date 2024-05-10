import { urls, baseURL } from '../support/util';

/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
declare namespace Cypress {
  interface Chainable {
    doLogin(user: string, pass: string): void;
    doLogout(): void;
  }
}

Cypress.Commands.add('doLogin', (user: string, pass: string) => {
  cy.visit(baseURL + urls.LOGIN);
  cy.get('[formControlName="email"]').type(user);
  cy.get('[formControlName="password"]').type(pass);
  cy.get('button[type="submit"]').click();
});

Cypress.Commands.add('doLogout', () => {
  cy.get('button[data-id="menu-trigger"]').click();
  cy.get('button[data-id="logout"]').click();
});
