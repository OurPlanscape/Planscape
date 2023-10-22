import { BASE_URL } from './urls';

describe('Home', () => {
  it('Shows welcome page', () => {
    cy.visit(BASE_URL);
    cy.contains('Welcome to Planscape!');
  });

  it('Explore takes you to map', () => {
    cy.visit(BASE_URL);
    cy.get('.explore').click();
    cy.location('pathname').should('eq', '/map');
  });

  describe('logged in', () => {
    it('should show planning areas', () => {
      cy.login();
      cy.get('.planning .mat-row').should('have.length.at.least', 1);
    });
  });
});
