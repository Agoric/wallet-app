import {
  DEFAULT_TIMEOUT,
  DEFAULT_TASK_TIMEOUT,
  DEFAULT_EXEC_TIMEOUT,
  config,
} from '../test.utils';

describe('Wallet App Test Cases', { execTimeout: DEFAULT_EXEC_TIMEOUT }, () => {
  const AGORIC_NET = Cypress.env('AGORIC_NET').trim() || 'local';
  const userConfig = config[AGORIC_NET === 'local' ? 'local' : 'testnet'];

  context('Test commands', () => {
    it('should setup the keplr wallet successfully', () => {
      cy.task('info', `AGORIC_NET: ${AGORIC_NET}`);

      cy.setupWallet({
        walletName: 'My Wallet',
        secretWords: userConfig.userWalletMnemonic,
      });
    });
    it(`should open the web wallet URL successfully`, () => {
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

      cy.setNetworkConfigURL(AGORIC_NET);

      cy.contains('button', 'Connect').click();

      cy.wait(5000);

      if (AGORIC_NET !== 'local') {
        cy.acceptAccess().then((taskCompleted) => {
          expect(taskCompleted).to.be.true;
        });
      }

      cy.reload();

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

    it('should create a new wallet', () => {
      cy.skipWhen(AGORIC_NET === 'local');
      cy.setupWallet({
        createNewWallet: true,
        walletName: 'newWallet',
        selectedChains: ['Agoric'],
      });
    });

    it('should succeed in provisioning the new wallet ', () => {
      cy.skipWhen(AGORIC_NET === 'local');
      cy.visit('/wallet/');

      cy.getWalletAddress('Agoric').then((address) => {
        // provision BLD
        cy.provisionFromFaucet(address, 'delegate');
        // provision IST
        cy.provisionFromFaucet(address, 'client');
      });

      cy.visit('/wallet/');
      cy.get('span')
        .contains('ATOM', { timeout: DEFAULT_TIMEOUT })
        .should('exist');
      cy.get('span')
        .contains('BLD', { timeout: DEFAULT_TIMEOUT })
        .should('exist');
    });

    it('should switch to "My Wallet" successfully', () => {
      cy.skipWhen(AGORIC_NET === 'local');
      cy.switchWallet('My Wallet').then((taskCompleted) => {
        expect(taskCompleted).to.be.true;
      });
    });
    it('should add keys using agd from the CLI successfully', () => {
      cy.addKeys({
        keyName: userConfig.userKeyName,
        mnemonic: userConfig.userWalletMnemonic,
        expectedAddress: userConfig.userWalletAddress,
      });
    });

    it('should create a vault minting 400 ISTs and giving 80 ATOMs as collateral', () => {
      cy.skipWhen(AGORIC_NET !== 'local');
      cy.createVault({
        wantMinted: 400,
        giveCollateral: 80,
        userKey: userConfig.userKeyName,
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
            fromAddress: userConfig.userWalletAddress,
            giveAmount: '2IST',
            discount: 5,
          }).then(() => {
            cy.wait(5000);
            cy.getTokenAmount('IST').then((tokenValue) => {
              expect(tokenValue).to.lessThan(initialTokenValue);
            });
          });
        });
        cy.wait(5000);
      },
    );

    it('should view the bid from CLI', () => {
      cy.listBids(userConfig.userWalletAddress);
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
        cy.wait(5000);
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
            fromAddress: userConfig.userWalletAddress,
            giveAmount: '1IST',
            price: 8.55,
          }).then(() => {
            cy.wait(5000);
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
        cy.wait(5000);
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
