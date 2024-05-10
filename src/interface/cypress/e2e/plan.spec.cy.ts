// TODO: use config'd user
describe('Draws a map', () => {
  it('Logs in and draws a map', () => {
    cy.doLogin();
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
