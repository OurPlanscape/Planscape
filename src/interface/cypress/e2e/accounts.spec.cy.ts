import { randString, urls, testPass, testUser } from '../support/util';

const newAcctEmail = 'cypress+' + randString(6) + '@local.example';
const newAcctPass = randString(15);
const newAcctFirstName = 'Cypress';
const newAcctLastName = 'Cypressington';

describe('Create an account with unmatching password', () => {
  it('Attempts to create an account with bad password', () => {
    cy.envCheck();
    cy.visit(urls.SIGNUP);
    cy.contains('Create your account');
    cy.get('[formControlName="firstName"]').type(newAcctFirstName);
    cy.get('[formControlName="lastName"]').type(newAcctLastName);
    cy.get('[formControlName="email"]').type(newAcctEmail);
    cy.get('.signup-title').click();
    cy.get('[formControlName="password1"]').type(newAcctPass);
    cy.get('.signup-title').click();
    cy.get('[formControlName="password2"]').type('Nope!#%');
    cy.get('.signup-title').click();
    cy.contains('Given passwords must match.');
    cy.get('button[type="submit"]').should('be.disabled');
  });

  it('Attempts to create an account', () => {
    cy.envCheck();
    cy.visit(urls.SIGNUP);
    cy.contains('Create your account');
    cy.get('[formControlName="firstName"]').type(newAcctFirstName);
    cy.get('[formControlName="lastName"]').type(newAcctLastName);
    cy.get('[formControlName="email"]').type(newAcctEmail);
    cy.get('[formControlName="password1"]').type(newAcctPass);
    cy.get('.signup-title').click();
    cy.get('[formControlName="password2"]').type(newAcctPass);
    cy.get('.signup-title').click();
    cy.get('button[type="submit"]').click();
    cy.wait(2000).then(() => {
      cy.contains('Thank You!');
    });
  });
});

describe('Login and logout with command', () => {
  it('Logs in and logs out using command', () => {
    cy.envCheck();
    expect(testUser).to.exist;
    expect(testPass).to.exist;
    cy.doLogin(testUser, testPass);
    cy.contains('Planning areas').should('be.visible');
    cy.doLogout();
    cy.contains('Welcome to Planscape').should('be.visible');
  });
});
