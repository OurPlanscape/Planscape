import { randString } from '../support/util';

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

describe('Create an account with unmatching password', () => {
  it('Visits the initial project page', () => {
    cy.visit('/signup');
    cy.contains('Create your account');
    cy.get('[formControlName="firstName"]').type('Test');
    cy.get('[formControlName="lastName"]').type('Person');
    cy.get('[formControlName="email"]').type(
      'newuser' + randString(5) + '@example.test'
    );
    cy.get('[formControlName="password1"]').type('ABCdef123!#%');
    cy.get('[formControlName="password2"]').type('Nope!#%');

    cy.contains('Given passwords must match.');
    cy.get('button[type="submit"]').should('be.disabled');
  });
});

// accounts
describe('Create an account', () => {
  it('Visits the initial project page', () => {
    cy.visit('/signup');
    cy.contains('Create your account');
    cy.get('[formControlName="firstName"]').type('Test');
    cy.get('[formControlName="lastName"]').type('Person');
    cy.get('[formControlName="email"]').type(
      'newuser' + randString(5) + '@example.test'
    );
    cy.get('[formControlName="password1"]').type('ABCdef123!#%');
    cy.get('[formControlName="password2"]').type('ABCdef123!#%');
    cy.get('button[type="submit"]').click();

    cy.wait(2000).then(() => {
      cy.contains('Thank You!');
    });
    // wait
  });
});
// create account

// login

// logout

// core operations:

// run
