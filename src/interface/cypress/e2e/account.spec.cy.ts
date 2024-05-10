import { randString, urls, baseURL, testPass, testUser } from '../support/util';

const test_email1 = 'localtest' + randString(6) + '@local.example';
const test_pass1 = 'ABCdef123#$%';
const test_firstname = 'Larry';
const test_lastname = 'Larrington';

// TODO: set this in test env ACCOUNT_EMAIL_VERIFICATION = "none" ?

describe('Create an account with unmatching password', () => {
  it('Visits the initial project page', () => {
    cy.visit(baseURL + urls.SIGNUP);
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

describe('Successfully create an account', () => {
  it('Visits the initial project page', () => {
    cy.visit(baseURL + urls.SIGNUP);
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
  });
});

describe('Login and logout with command', () => {
  it('Logs in and logs out using command', () => {
    cy.doLogin(testUser, testPass);
    cy.contains('Planning areas').should('be.visible');
    cy.doLogout();
    cy.contains('Welcome to Planscape').should('be.visible');
  });
});
