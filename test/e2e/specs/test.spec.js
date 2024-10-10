import {
  DEFAULT_TIMEOUT,
  DEFAULT_TASK_TIMEOUT,
  DEFAULT_EXEC_TIMEOUT,
  QUICK_WAIT,
  config,
} from '../test.utils';

describe('Wallet App Test Cases', { execTimeout: DEFAULT_EXEC_TIMEOUT }, () => {
  const AGORIC_NET = Cypress.env('AGORIC_NET').trim() || 'local';
  const userConfig = config[AGORIC_NET === 'local' ? 'local' : 'testnet'];
  let istBalance = 0;

  context('Bidding Tests', () => {
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

      cy.acceptAccess().then((taskCompleted) => {
        expect(taskCompleted).to.be.true;
      });

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

    it('should save user1 IST balance before placing bid', () => {
      cy.getISTBalance({
        walletAddress: userConfig.userWalletAddress,
      }).then((output) => {
        istBalance = Number(output.toFixed(2));
        cy.task('info', `user1 IST Balance: ${istBalance}`);
      });
    });

    it(
      'should place a bid by discount',
      {
        taskTimeout: DEFAULT_TASK_TIMEOUT,
      },
      () => {
        cy.placeBidByDiscount({
          fromAddress: userConfig.userWalletAddress,
          giveAmount: '2IST',
          discount: 5,
        });
      },
    );

    it("should see decrease in user1's IST balance after placing bid", () => {
      cy.wait(QUICK_WAIT);
      cy.getISTBalance({
        walletAddress: userConfig.userWalletAddress,
      }).then((newBalance) => {
        cy.task('info', `Initial user1 IST Balance: ${istBalance}`);
        cy.task('info', `New user1 IST Balance: ${newBalance}`);
        expect(newBalance).to.be.lessThan(istBalance);
        istBalance = newBalance;
      });
    });

    it('should view the bid from CLI', () => {
      cy.listBids(userConfig.userWalletAddress);
    });

    it('should view the bid on wallet app UI', () => {
      cy.visit('/wallet/');

      cy.contains('Offer').should('be.visible');
      cy.contains('Give Bid').should('be.visible');
      cy.contains('2.00 IST').should('be.visible');
      cy.contains('from IST').should('be.visible');
      cy.contains('Arguments').should('be.visible');
    });

    it('should cancel the bid by discount', () => {
      cy.visit('/wallet/');
      cy.contains('Exit').click();
      cy.acceptAccess().then((taskCompleted) => {
        expect(taskCompleted).to.be.true;
      });
      cy.contains('Accepted', { timeout: DEFAULT_TIMEOUT }).should('exist');
    });

    it("should see increase in user1's IST balance after canceling bid", () => {
      cy.wait(QUICK_WAIT);
      cy.getISTBalance({
        walletAddress: userConfig.userWalletAddress,
      }).then((newBalance) => {
        cy.task('info', `Initial user1 IST Balance: ${istBalance}`);
        cy.task('info', `New user1 IST Balance: ${newBalance}`);
        expect(newBalance).to.be.greaterThan(istBalance);
        istBalance = newBalance;
      });
    });

    it(
      'should place a bid by price',
      {
        taskTimeout: DEFAULT_TASK_TIMEOUT,
      },
      () => {
        cy.placeBidByPrice({
          fromAddress: userConfig.userWalletAddress,
          giveAmount: '1IST',
          price: 8.55,
        });
      },
    );

    it("should see decrease in user1's IST balance after placing bid", () => {
      cy.wait(QUICK_WAIT);
      cy.getISTBalance({
        walletAddress: userConfig.userWalletAddress,
      }).then((newBalance) => {
        cy.task('info', `Initial user1 IST Balance: ${istBalance}`);
        cy.task('info', `New user1 IST Balance: ${newBalance}`);
        expect(newBalance).to.be.lessThan(istBalance);
        istBalance = newBalance;
      });
    });

    it('should view the bid on wallet app UI', () => {
      cy.visit('/wallet/');
      cy.contains('Offer').should('be.visible');
      cy.contains('Give Bid').should('be.visible');
      cy.contains('1.00 IST').should('be.visible');
      cy.contains('from IST').should('be.visible');
      cy.contains('Arguments').should('be.visible');
    });

    it('should cancel the bid by price', () => {
      cy.visit('/wallet/');
      cy.contains('Exit').click();
      cy.acceptAccess().then((taskCompleted) => {
        expect(taskCompleted).to.be.true;
      });
      cy.contains('Accepted', { timeout: DEFAULT_TIMEOUT }).should('exist');
    });

    it("should see increase in user1's IST balance after canceling bid", () => {
      cy.wait(QUICK_WAIT);
      cy.getISTBalance({
        walletAddress: userConfig.userWalletAddress,
      }).then((newBalance) => {
        cy.task('info', `Initial user1 IST Balance: ${istBalance}`);
        cy.task('info', `New user1 IST Balance: ${newBalance}`);
        expect(newBalance).to.be.greaterThan(istBalance);
        istBalance = newBalance;
      });
    });

    it('should check the auction status and ensure required fields are present', () => {
      cy.checkAuctionStatus().then((success) => {
        expect(success).to.be.true;
      });
    });
  });
});
