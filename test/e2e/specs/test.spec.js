/* eslint-disable ui-testing/no-disabled-tests */
describe('Wallet App Test Cases', () => {
  context('Test commands', () => {
    it(`should setup Keplr account and connect with Agoric Chain`, () => {
      cy.setupWallet().then((setupFinished) => {
        expect(setupFinished).to.be.true;

        cy.visit('localhost:3000');

        cy.acceptAccess().then((taskCompleted) => {
          expect(taskCompleted).to.be.true;
        });
      });
    });

    it('should connect with keplr wallet and succeed in provisioning a new wallet', () => {
      cy.visit('localhost:3000/wallet/');

      cy.get('input.PrivateSwitchBase-input').click();
      cy.contains('Proceed').click();

      cy.get('button[aria-label="Settings"]').click();

      cy.get('#demo-simple-select').click();
      cy.get('li[data-value="local"]').click();
      cy.contains('button', 'Connect').click();

      cy.acceptAccess().then((taskCompleted) => {
        expect(taskCompleted).to.be.true;
      });
    });
  });
});
