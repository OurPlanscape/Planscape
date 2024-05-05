import { randString } from 'cypress/support/util';

const randText = randString(10);
const randPass = randString(20);

const test_email1 = 'testuser+' + randText + '@whatever.example';
const test_pass1 = 'test' + randPass;
const test_firstname = 'Larry';
const test_lastname = 'Larrington';

// TODO: set this in test env ACCOUNT_EMAIL_VERIFICATION = "none"

// smoke tests:
describe('Create an account with unmatching password', () => {
  it('Visits the initial project page', () => {
    cy.visit('/signup');
    cy.contains('Create your account');
    cy.get('[formControlName="firstName"]').type(test_firstname);
    cy.get('[formControlName="lastName"]').type(test_lastname);
    cy.get('[formControlName="email"]').type(test_email1);
    cy.get('[formControlName="password1"]').type(test_pass1);
    cy.get('[formControlName="password2"]').type('Nope!#%');
    cy.contains('Given passwords must match.');
    cy.get('button[type="submit"]').should('be.disabled');
  });
});

// accounts
describe('Successfully create an account', () => {
  it('Visits the initial project page', () => {
    cy.visit('/signup');
    cy.contains('Create your account');
    cy.get('[formControlName="firstName"]').type(test_firstname);
    cy.get('[formControlName="lastName"]').type(test_lastname);
    cy.get('[formControlName="email"]').type(test_email1);
    cy.get('[formControlName="password1"]').type(test_pass1);
    cy.get('[formControlName="password2"]').type(test_pass1);
    cy.get('button[type="submit"]').click();
    cy.wait(2000).then(() => {
      cy.contains('Thank You!');
    });
    // wait
  });
});

describe('Login and logout', () => {
  it('Logs in and logs out', () => {
    cy.visit('/login');
    cy.contains('Sign in to Planscape');
    cy.get('[formControlName="email"]').type(test_email1);
    cy.get('[formControlName="password"]').type(test_pass1);
    cy.get('button[type="submit"]').click();
    // wait
    cy.contains('Planning areas').should('be.visible');

    cy.get('button[data-id="menu-trigger"]').click();
    cy.get('button[data-id="logout"]').click();
    // wait

    cy.contains('Welcome to Planscape').should('be.visible');
  });
});

// login
// logout
// core operations:
