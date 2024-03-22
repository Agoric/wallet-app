/* eslint-disable ui-testing/no-disabled-tests */
describe('Wallet App Test Cases', () => {
  context('Test commands', () => {
    it(`should setup Keplr account and connect with Agoric Chain`, () => {
      cy.setupWallet().then((setupFinished) => {
        expect(setupFinished).to.be.true;

        cy.visit('/');

        cy.acceptAccess().then((taskCompleted) => {
          expect(taskCompleted).to.be.true;
        });
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
    });

    it('should check if agops is working', () => {
      cy.exec('agops -V').then((result) => {
        const { _, stderr } = result;
        expect(stderr).to.be.empty;
      });
    });

    it('should check if agd is working', () => {
      cy.exec('agd version').then((result) => {
        const { _, stderr } = result;
        expect(stderr).to.be.empty;
      });
    });

    it('should place a bid by price from the CLI successfully', () => {
      cy.exec('bash ./test/e2e/test-scripts/place-bid-by-price.sh').then(
        (result) => {
          const { stdout, stderr, code } = result;
          if (code === 0) {
            expect(stdout).to.contain('Your bid has been accepted');
          } else {
            throw new Error(`Script execution failed: ${stderr}`);
          }
        },
      );
    });

    it('should place a bid by discount from the CLI successfully', () => {
      cy.exec('bash ./test/e2e/test-scripts/place-bid-by-discount.sh').then(
        (result) => {
          const { stdout, stderr, code } = result;
          if (code === 0) {
            expect(stdout).to.contain('Your bid has been accepted');
          } else {
            throw new Error(`Script execution failed: ${stderr}`);
          }
        },
      );
    });
  });
});
