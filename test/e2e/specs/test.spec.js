import { NETWORK_CONFIG_URL } from '../constants';
import {
  mnemonics,
  accountAddresses,
  DEFAULT_TIMEOUT,
  DEFAULT_TASK_TIMEOUT,
  DEFAULT_EXEC_TIMEOUT,
} from '../test.utils';
describe('Wallet App Test Cases', { execTimeout: DEFAULT_EXEC_TIMEOUT }, () => {
  const AGORIC_NET = Cypress.env('AGORIC_NET') || 'emerynet';
  const networkConfigURL = NETWORK_CONFIG_URL[AGORIC_NET];
  context('Test commands', () => {
    it(`should connect with Agoric Chain`, () => {
      cy.task('info', `AGORIC_NET: ${AGORIC_NET}`);

      cy.visit('/');

      cy.acceptAccess().then((taskCompleted) => {
        expect(taskCompleted).to.be.true;
      });
    });

    it('should setup web wallet successfully', () => {
      cy.visit('/wallet/');

      cy.get('input[type="checkbox"]').check();
      cy.contains('Proceed').click();
      cy.get('button[aria-label="Settings"]').click();

      cy.contains('Mainnet').click();
      cy.contains('Custom URL').should('be.visible').click();

      cy.get('input[value="https://main.agoric.net/network-config"]')
        .should('be.visible')
        .click()
        .then(($input) => {
          cy.wrap($input).clear().type(networkConfigURL);
        })
        .should('have.value', networkConfigURL);

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

    it('should succeed in provisioning a new wallet ', () => {
      cy.setupWallet({
        createNewWallet: true,
        walletName: 'newWallet',
        selectedChains: ['Agoric'],
      });

      cy.getWalletAddress('Agoric').then((address) => {
        // provision BLD
        cy.provisionFromFaucet(address, 'delegate');
        // provision IST
        cy.provisionFromFaucet(address, 'client');
      });

      cy.visit('/wallet/');
      cy.get('span').contains('ATOM').should('exist');
      cy.get('span').contains('BLD').should('exist');
    });

    it('should switch to "My Wallet" successfully', () => {
      cy.switchWallet('My Wallet').then((taskCompleted) => {
        expect(taskCompleted).to.be.true;
      });
    });
    it('should add keys using agd from the CLI successfully', () => {
      cy.addKeys({
        keyName: 'user2',
        mnemonic: mnemonics.user2,
        expectedAddress: accountAddresses.user2,
      });
    });

    it(
      'should place a bid by discount from the CLI successfully and verify IST balance',
      {
        taskTimeout: DEFAULT_TASK_TIMEOUT,
      },
      () => {
        cy.addNewTokensFound();
        cy.getTokenAmount('IST').then((initialTokenValue) => {
          cy.placeBidByDiscount({
            fromAddress: accountAddresses.user2,
            giveAmount: '2IST',
            discount: 5,
          }).then(() => {
            cy.getTokenAmount('IST').then((tokenValue) => {
              expect(tokenValue).to.lessThan(initialTokenValue);
            });
          });
        });
      },
    );

    it('should view the bid from CLI', () => {
      cy.listBids(accountAddresses.user2);
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
        cy.contains('Exit').click();
        cy.acceptAccess().then((taskCompleted) => {
          expect(taskCompleted).to.be.true;
        });
        cy.contains('Accepted', { timeout: DEFAULT_TIMEOUT }).should('exist');
        cy.getTokenAmount('IST').then((tokenValue) => {
          expect(tokenValue).to.greaterThan(initialTokenValue);
        });
      });
    });

    it(
      'should place a bid by price from the CLI successfully and verify IST balance',
      {
        taskTimeout: DEFAULT_TASK_TIMEOUT,
      },
      () => {
        cy.getTokenAmount('IST').then((initialTokenValue) => {
          cy.placeBidByPrice({
            fromAddress: accountAddresses.user2,
            giveAmount: '1IST',
            price: 8.55,
          }).then(() => {
            cy.getTokenAmount('IST').then((tokenValue) => {
              expect(tokenValue).to.lessThan(initialTokenValue);
            });
          });
        });
      },
    );

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
        cy.contains('Exit').click();
        cy.acceptAccess().then((taskCompleted) => {
          expect(taskCompleted).to.be.true;
        });
        cy.contains('Accepted', { timeout: DEFAULT_TIMEOUT }).should('exist');
        cy.getTokenAmount('IST').then((tokenValue) => {
          expect(tokenValue).to.greaterThan(initialTokenValue);
        });
      });
    });

    it('should check the auction status and ensure required fields are present', () => {
      cy.checkAuctionStatus().then((success) => {
        expect(success).to.be.true;
      });
    });
  });
});
