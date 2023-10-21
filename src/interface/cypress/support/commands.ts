/// <reference types="cypress"/>
// ***********************************************
// This example namespace declaration will help
// with Intellisense and code completion in your
// IDE or Text Editor.
// ***********************************************

import { LOGIN_URL } from '../e2e/urls';

declare namespace Cypress {
  interface Chainable {
    login(): void;
  }
}

//NOTE: You can use it like so:
Cypress.Commands.add('login', () => {
  cy.visit(LOGIN_URL);
  cy.get('[formControlName="email"]').type('plopez+test@sig-gis.com');
  cy.get('[formControlName="password"]').type('passwordTest');
  cy.get('button[type="submit"]').click();
});
//
// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
