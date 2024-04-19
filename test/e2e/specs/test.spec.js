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

    it('should add keys using agd from the CLI successfully', () => {
      cy.exec('bash ./test/e2e/test-scripts/add-keys.sh').then((result) => {
        expect(result.stderr).to.contain('');
        expect(result.stdout).to.contain('Keys for user1 added successfully');
      });
    });

    it('should place a bid by discount from the CLI successfully', () => {
      cy.addNewTokensFound();
      cy.getTokenAmount('IST').then((initialTokenValue) => {
        cy.exec('bash ./test/e2e/test-scripts/place-bid-by-discount.sh').then(
          (result) => {
            expect(result.stderr).to.contain('');
            expect(result.stdout).to.contain('Your bid has been accepted');
            cy.getTokenAmount('IST').then((tokenValue) => {
              expect(tokenValue).to.lessThan(initialTokenValue);
            });
          },
        );
      });
    });

    it('should view the bid from CLI', () => {
      cy.exec('bash ./test/e2e/test-scripts/view-bids.sh', {
        failOnNonZeroExit: false,
      }).then((result) => {
        expect(result.stderr).to.contain('');
        expect(result.stdout).to.contain('"give":{"Bid":"2.00 IST"}');
        expect(result.stdout).to.contain('Your bid has been accepted');
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
        cy.exec('bash ./test/e2e/test-scripts/place-bid-by-price.sh').then(
          (result) => {
            expect(result.stderr).to.contain('');
            expect(result.stdout).to.contain('Your bid has been accepted');
            cy.getTokenAmount('IST').then((tokenValue) => {
              expect(tokenValue).to.lessThan(initialTokenValue);
            });
          },
        );
      });
    });
    it('should view the bid from CLI', () => {
      cy.exec('bash ./test/e2e/test-scripts/view-bids.sh', {
        failOnNonZeroExit: false,
      }).then((result) => {
        expect(result.stderr).to.contain('');
        expect(result.stdout).to.contain('"give":{"Bid":"1.00 IST"}');
        expect(result.stdout).to.contain('Your bid has been accepted');
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

    it('should set ATOM price to 12.34', () => {
      cy.exec('bash ./test/e2e/test-scripts/set-oracle-price.sh 12.34', {
        failOnNonZeroExit: false,
      }).then((result) => {
        expect(result.stderr).to.contain('');
        expect(result.stdout).to.contain('Success: Price set to 12.34');
      });
    });
  });
});
