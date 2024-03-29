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

    it('should check if agops is working', () => {
      cy.exec('agops', { failOnNonZeroExit: false }).then((result) => {
        expect(result.code).to.equal(1);
        expect(result.stderr).to.contain('Usage: agops [options] [command]');
      });
    });

    it('should check if agd is working', () => {
      cy.exec('agd').then((result) => {
        expect(result.stderr).to.be.empty;
      });
    });

    it('should add keys using agd from the CLI successfully', () => {
      cy.exec('bash ./test/e2e/test-scripts/add-keys.sh').then((result) => {
        expect(result.stderr).to.contain('');
        expect(result.stdout).to.contain('Keys added successfully');
      });
    });

    it('should place a bid by discount from the CLI successfully', () => {
      cy.exec('bash ./test/e2e/test-scripts/place-bid-by-discount.sh').then(
        (result) => {
          expect(result.stderr).to.contain('');
          expect(result.stdout).to.contain('Bid Placed Successfully');
        },
      );
    });

    it('should only have one element with specific parameters for the bid created in the previous test case', () => {
      cy.visit('/wallet/');

      cy.get('.RequestSummary h6').contains('Offer');
      cy.get('.Body .MuiChip-label').contains('Pending');
      cy.get('.OfferEntry h6').contains('Give Bid');
      cy.get('.OfferEntry .Token .MuiBox-root').contains('2.00 IST');
      cy.get('.OfferEntry .Token').contains('from IST');
      cy.get('.OfferEntry h6').contains('Arguments');
      cy.get('.Request').should('have.length', 1);
    });

    it('should cancel the bid by discount', () => {
      cy.visit('/wallet/');
      cy.get('.Controls .MuiChip-root').contains('Exit').click();
      cy.acceptAccess().then((taskCompleted) => {
        expect(taskCompleted).to.be.true;
      });
      cy.get('.Body .MuiChip-label')
        .contains('Accepted', { timeout: 120000 })
        .should('exist');
    });

    it('should place a bid by price from the CLI successfully', () => {
      cy.exec('bash ./test/e2e/test-scripts/place-bid-by-price.sh').then(
        (result) => {
          expect(result.stderr).to.contain('');
          expect(result.stdout).to.contain('Bid Placed Successfully');
        },
      );
    });

    it('should only have one element with specific parameters for the bid created in the previous test case', () => {
      cy.visit('/wallet/');

      cy.get('.RequestSummary h6').contains('Offer');
      cy.get('.Body .MuiChip-label').contains('Pending');
      cy.get('.OfferEntry h6').contains('Give Bid');
      cy.get('.OfferEntry .Token .MuiBox-root').contains('1.00 IST');
      cy.get('.OfferEntry .Token').contains('from IST');
      cy.get('.OfferEntry h6').contains('Arguments');
      cy.get('.Request').should('have.length', 1);
    });

    it('should cancel the bid by price', () => {
      cy.visit('/wallet/');
      cy.get('.Controls .MuiChip-root').contains('Exit').click();
      cy.acceptAccess().then((taskCompleted) => {
        expect(taskCompleted).to.be.true;
      });
      cy.get('.Body .MuiChip-label')
        .contains('Accepted', { timeout: 120000 })
        .should('exist');
    });
  });
});
