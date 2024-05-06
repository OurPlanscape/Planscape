const test_email1 = 'localtest@local.example';
const test_pass1 = 'ABCdef123#$%';

// TODO: use config'd user
describe('Login', () => {
  it('Logs in and draws a map', () => {
    cy.visit('/login');
    cy.contains('Sign in to Planscape');
    cy.get('[formControlName="email"]').type(test_email1);
    cy.get('[formControlName="password"]').type(test_pass1);
    cy.get('button[type="submit"]').click();
    // wait
    cy.contains('Planning areas').should('be.visible');

    // go to Explore
    cy.get('a[href="/map"]').click();
    cy.contains('Map Control Panel').should('be.visible');

    // Draw a map

    // name it

    // save it

    //---
    // upload a map
    // name it
    // save it

    //---
  });
});
