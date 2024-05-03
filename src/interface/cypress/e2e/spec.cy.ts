describe('Login', () => {
  it('Visits the initial project page', () => {
    cy.visit('/login');
    cy.contains('Sign in to Planscape');
    cy.get('[formControlName="email"]').type('mkinsella+localdev@sig-gis.com');
    cy.get('[formControlName="password"]').type('mcw9zej@xet3GWV6dhg');
    cy.get('button[type="submit"]').click();
    // wait
    cy.contains('Planning areas');
  });
});

// smoke tests:

// accounts

// create account

// login

// logout

// core operations:

// run
