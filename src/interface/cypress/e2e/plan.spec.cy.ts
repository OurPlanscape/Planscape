import { testPass, testUser } from '../support/util';
// TODO: use config'd user
describe('Draws a map', () => {
  it('Logs in and draws a map', () => {
    cy.doLogin(testUser, testPass);
    cy.url().should('include', '/home');
    cy.get('app-planning-areas').should('exist');
    // go to Explore
    cy.get('a[href="/map"]').click();
    cy.contains('Map Control Panel').should('be.visible');
  });
});
