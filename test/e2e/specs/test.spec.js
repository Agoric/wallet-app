/* eslint-disable ui-testing/no-disabled-tests */
describe('Wallet App Test Cases', () => {
  context('Test commands', () => {
    it(`should connect with Agoric Chain`, () => {
      cy.visit('/');

      cy.acceptAccess().then((taskCompleted) => {
        expect(taskCompleted).to.be.true;
      });
    });

    it('should connect with keplr wallet and succeed in provisioning a new wallet', () => {
      cy.visit('/wallet/');

      cy.get('input.PrivateSwitchBase-input').click();
      cy.contains('Proceed').click();

      cy.get('button[aria-label="Settings"]').click();

      cy.get('#demo-simple-select').click();
      cy.get('li[data-value="testnet"]').click();
      cy.contains('button', 'Connect').click();

      cy.acceptAccess().then((taskCompleted) => {
        expect(taskCompleted).to.be.true;
      });

      cy.reload();

      cy.acceptAccess().then((taskCompleted) => {
        expect(taskCompleted).to.be.true;
      });

      cy.get('span').contains('ATOM').should('exist');
      cy.get('span').contains('BLD').should('exist');
    });
  });
});
