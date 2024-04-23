/* eslint-disable ui-testing/no-disabled-tests */
import {
  EMERYNET_FAUCET_URL,
  DEFAULT_TIMEOUT,
  AGORIC_ADDR_RE,
} from '../constants';
describe('Wallet App Test Cases', () => {
  context('Test commands', () => {
    it(`should connect with Agoric Chain`, () => {
      cy.visit('/');

      cy.acceptAccess().then((taskCompleted) => {
        expect(taskCompleted).to.be.true;
      });
    });

    it('should setup web wallet successfully', () => {
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

    // disabled this test case UNTIL https://github.com/Agoric/wallet-app/issues/161
    it.skip('should succeed in provisioning a new wallet ', () => {
      const walletAddress = {
        value: null,
      };

      cy.setupWallet({
        createNewWallet: true,
        walletName: 'user1',
      });

      cy.visit('/wallet');
      // Matches a wallet address pattern that starts with "agoric1" and is followed by exactly 38 characters.
      cy.contains(AGORIC_ADDR_RE)
        .spread((element) => {
          return element.innerHTML.match(AGORIC_ADDR_RE)[0];
        })
        .then((address) => {
          walletAddress.value = address;
        });

      cy.origin(
        EMERYNET_FAUCET_URL,
        { args: { walletAddress } },
        ({ walletAddress }) => {
          cy.visit('/');
          cy.get('[id="address"]').first().type(walletAddress.value);
          cy.get('[type="submit"]').first().click();
          cy.get('body').contains('success').should('exist');
        },
      );

      cy.visit('/wallet');
      cy.contains('button', 'Create').click();

      cy.acceptAccess().then((taskCompleted) => {
        expect(taskCompleted).to.be.true;
      });

      cy.get('span')
        .contains('ATOM', { timeout: DEFAULT_TIMEOUT })
        .should('exist');
      cy.get('span')
        .contains('BLD', { timeout: DEFAULT_TIMEOUT })
        .should('exist');
    });

    // disabled this test case UNTIL https://github.com/Agoric/wallet-app/issues/161
    it.skip('should switch to "My Wallet" successfully', () => {
      cy.switchWallet('My Wallet').then((taskCompleted) => {
        expect(taskCompleted).to.be.true;
      });
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
