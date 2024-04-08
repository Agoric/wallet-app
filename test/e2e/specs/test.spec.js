/* eslint-disable ui-testing/no-disabled-tests */
describe('Wallet App Test Cases', () => {
  context('Test commands', () => {
    it(`should setup wallet and connect with Agoric Chain`, () => {
      cy.setupWallet();
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

    it('should add keys using agd from the CLI successfully', () => {
      cy.exec('bash ./test/e2e/test-scripts/add-keys.sh').then((result) => {
        expect(result.stderr).to.contain('');
        expect(result.stdout).to.contain('Keys added successfully');
      });
    });

    it('should place a bid by discount from the CLI successfully', () => {
      cy.addNewTokensFound();
      cy.getTokenAmount('IST').then((initialTokenValue) => {
        cy.exec('bash ./test/e2e/test-scripts/place-bid-by-discount.sh', {
          failOnNonZeroExit: false,
        }).then((result) => {
          expect(result.stderr).to.contain('');
          expect(result.stdout).to.contain('Bid Placed Successfully');
          cy.getTokenAmount('IST').then((tokenValue) => {
            expect(tokenValue).to.lessThan(initialTokenValue);
          });
        });
      });
    });

    it('should see an offer placed in the previous test case', () => {
      cy.visit('/wallet/');

      cy.contains('Offer').should('be.visible');
      cy.contains('Give Bid').should('be.visible');
      cy.contains('2.00 IST').should('be.visible');
      cy.contains('from IST').should('be.visible');
      cy.contains('Arguments').should('be.visible');
    });

    it('should cancel the bid by discount and verify IST balance', () => {
      cy.getTokenAmount('IST').then((initialTokenValue) => {
        cy.visit('/wallet/');
        cy.get('.Controls .MuiChip-root').contains('Exit').click();
        cy.acceptAccess().then((taskCompleted) => {
          expect(taskCompleted).to.be.true;
        });
        cy.get('.Body .MuiChip-label')
          .contains('Accepted', { timeout: 120000 })
          .should('exist');
        cy.getTokenAmount('IST').then((tokenValue) => {
          expect(tokenValue).to.greaterThan(initialTokenValue);
        });
      });
    });

    it('should place a bid by price from the CLI successfully and verify IST balance', () => {
      cy.getTokenAmount('IST').then((initialTokenValue) => {
        cy.exec('bash ./test/e2e/test-scripts/place-bid-by-price.sh', {
          failOnNonZeroExit: false,
        }).then((result) => {
          expect(result.stderr).to.contain('');
          expect(result.stdout).to.contain('Bid Placed Successfully');
          cy.getTokenAmount('IST').then((tokenValue) => {
            expect(tokenValue).to.lessThan(initialTokenValue);
          });
        });
      });
    });

    it('should see an offer placed in the previous test case', () => {
      cy.visit('/wallet/');
      cy.contains('Offer').should('be.visible');
      cy.contains('Give Bid').should('be.visible');
      cy.contains('1.00 IST').should('be.visible');
      cy.contains('from IST').should('be.visible');
      cy.contains('Arguments').should('be.visible');
    });

    it('should cancel the bid by price and verify IST balance', () => {
      cy.getTokenAmount('IST').then((initialTokenValue) => {
        cy.visit('/wallet/');
        cy.get('.Controls .MuiChip-root').contains('Exit').click();
        cy.acceptAccess().then((taskCompleted) => {
          expect(taskCompleted).to.be.true;
        });
        cy.get('.Body .MuiChip-label')
          .contains('Accepted', { timeout: 120000 })
          .should('exist');
        cy.getTokenAmount('IST').then((tokenValue) => {
          expect(tokenValue).to.greaterThan(initialTokenValue);
        });
      });
    });

    it('should view the auction from the CLI successfully', () => {
      cy.exec('bash ./test/e2e/test-scripts/view-auction.sh', {
        failOnNonZeroExit: false,
      }).then((result) => {
        expect(result.stderr).to.contain('');
        expect(result.stdout).to.contain('All required fields are present');
      });
    });
  });
});
