import { testPass, testUser } from '../support/util';
// TODO: use config'd user
describe('Creates a scenario', () => {
  it('Logs in and creates a new scenario', () => {
    cy.doLogin(testUser, testPass);
    cy.contains('Planning areas').should('be.visible');

    // go to Explore
    cy.get('a[href="/map"]').click();
    cy.contains('Map Control Panel').should('be.visible');
  });
});
