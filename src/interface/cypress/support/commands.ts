Cypress.Commands.add('login', (email, pw) => {});

Cypress.Commands.addAll({
  login(email, pw) {},
  visit(orig, url, options) {},
});
Cypress.Commands.overwrite('visit', (orig, url, options) => {});
