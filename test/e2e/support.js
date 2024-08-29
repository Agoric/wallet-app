import '@agoric/synpress/support/index';
import { flattenObject, FACUET_HEADERS, MINUTE_MS, config } from './test.utils';
import { FAUCET_URL_MAP } from './constants';

const AGORIC_NET = Cypress.env('AGORIC_NET').trim() || 'local';
const environment = Cypress.env('ENVIRONMENT');
const agops =
  environment === 'ci'
    ? '/usr/src/agoric-sdk/packages/agoric-cli/bin/agops'
    : 'agops';

Cypress.Commands.add('addKeys', (params) => {
  const { keyName, mnemonic, expectedAddress } = params;
  const command = `echo ${mnemonic} | agd keys add ${keyName} --recover --keyring-backend=test`;

  cy.exec(command, { failOnNonZeroExit: false }).then(({ stdout }) => {
    expect(stdout).to.contain(expectedAddress);
  });
});

Cypress.Commands.add('placeBidByPrice', (params) => {
  const { fromAddress, giveAmount, price } = params;
  const command = `${agops} inter bid by-price --from ${fromAddress} --give ${giveAmount} --price ${price} --keyring-backend=test`;

  cy.exec(command, { env: { AGORIC_NET }, failOnNonZeroExit: false }).then(
    ({ stdout }) => {
      expect(stdout).to.contain('Your bid has been accepted');
    },
  );
});

Cypress.Commands.add('placeBidByDiscount', (params) => {
  const { fromAddress, giveAmount, discount } = params;

  const command = `${agops} inter bid by-discount --from ${fromAddress} --give ${giveAmount} --discount ${discount} --keyring-backend=test`;

  cy.exec(command, { env: { AGORIC_NET }, failOnNonZeroExit: false }).then(
    ({ stdout }) => {
      expect(stdout).to.contain('Your bid has been accepted');
    },
  );
});

Cypress.Commands.add('checkAuctionStatus', () => {
  cy.exec(`agops inter auction status`, {
    env: { AGORIC_NET },
    failOnNonZeroExit: false,
  }).then(({ stdout }) => {
    const output = JSON.parse(stdout);

    const requiredFields = [
      'schedule.nextStartTime',
      'schedule.nextDescendingStepTime',
      'book0.startCollateral',
      'book0.collateralAvailable',
      'params.DiscountStep',
      'params.ClockStep',
      'params.LowestRate',
    ];

    const outputKeys = Object.keys(flattenObject(output));
    const missingKeys = requiredFields.filter(
      (key) => !outputKeys.includes(key),
    );

    expect(missingKeys.length).to.equal(
      0,
      `Missing keys: ${missingKeys.join(',')}`,
    );

    return missingKeys.length === 0;
  });
});

Cypress.Commands.add('listBids', (userAddress) => {
  return cy
    .exec(
      `${agops} inter bid list --from ${userAddress} --keyring-backend=test`,
      {
        env: { AGORIC_NET },
        failOnNonZeroExit: false,
      },
    )
    .then(({ stdout }) => {
      expect(stdout).to.contain('Your bid has been accepted');
    });
});

Cypress.Commands.add('provisionFromFaucet', (walletAddress, command) => {
  const TRANSACTION_STATUS = {
    FAILED: 1000,
    NOT_FOUND: 1001,
    SUCCESSFUL: 1002,
  };

  const getStatus = (txHash) =>
    cy
      .request({
        method: 'GET',
        url: `https://${AGORIC_NET}.faucet.agoric.net/api/transaction-status/${txHash}`,
      })
      .then((resp) => {
        const { transactionStatus } = resp.body;
        if (transactionStatus === TRANSACTION_STATUS.NOT_FOUND)
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          return cy.wait(2000).then(() => getStatus(txHash));
        else return cy.wrap(transactionStatus);
      });

  cy.request({
    body: {
      address: walletAddress,
      command,
      clientType: 'SMART_WALLET',
    },
    followRedirect: false,
    headers: FACUET_HEADERS,
    method: 'POST',
    url: `https://${AGORIC_NET}.faucet.agoric.net/go`,
  })
    .then((resp) =>
      getStatus(/\/transaction-status\/(.*)/.exec(resp.headers.location)[1]),
    )
    .then((status) => expect(status).to.eq(TRANSACTION_STATUS.SUCCESSFUL));
});

Cypress.Commands.add('setNetworkConfigURL', (agoricNet) => {
  let networkConfigURL = '';

  if (agoricNet === 'local')
    // UNTIL https://github.com/Agoric/wallet-app/issues/184
    networkConfigURL = 'https://wallet.agoric.app/wallet/network-config';
  else networkConfigURL = `https://${agoricNet}.agoric.net/network-config`;

  cy.get('input[value="https://main.agoric.net/network-config"]')
    .should('be.visible')
    .click()
    .then(($input) => {
      cy.wrap($input).clear().type(networkConfigURL);
    })
    .should('have.value', networkConfigURL);
});

afterEach(function () {
  if (this.currentTest.state === 'failed') {
    const testName = this.currentTest.title;
    const errorMessage = this.currentTest.err.message;
    cy.task('info', `Test "${testName}" failed with error: ${errorMessage}`);
  }
});

Cypress.Commands.add('skipWhen', function (expression) {
  if (expression) {
    this.skip();
  }
});

Cypress.Commands.add('createVault', (params) => {
  const { wantMinted, giveCollateral, userKey } = params;

  const createVaultCommand = `${agops} vaults open --wantMinted "${wantMinted}" --giveCollateral "${giveCollateral}" > /tmp/want-ist.json`;

  cy.exec(createVaultCommand, {
    env: { AGORIC_NET },
    timeout: config[AGORIC_NET].COMMAND_TIMEOUT,
  }).then(({ stdout }) => {
    expect(stdout).not.to.contain('Error');

    const broadcastCommand = `${agops} perf satisfaction --executeOffer /tmp/want-ist.json --from "${userKey}" --keyring-backend=test`;

    cy.exec(broadcastCommand, {
      env: { AGORIC_NET },
      timeout: config[AGORIC_NET].COMMAND_TIMEOUT,
    }).then(({ stdout }) => {
      expect(stdout).not.to.contain('Error');
    });
  });
});
