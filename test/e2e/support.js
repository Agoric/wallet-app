import '@agoric/synpress/support/index';
import { flattenObject, FACUET_HEADERS, MINUTE_MS } from './test.utils';
import { FAUCET_URL_MAP, NETWORK_CONFIG_URL } from './constants';

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
  cy.request({
    method: 'POST',
    url: FAUCET_URL_MAP[AGORIC_NET],
    body: {
      address: walletAddress,
      command,
      clientType: 'SMART_WALLET',
    },
    headers: FACUET_HEADERS,
    timeout: 4 * MINUTE_MS,
    retryOnStatusCodeFailure: true,
  }).then((resp) => {
    expect(resp.body).to.eq('success');
  });
});

Cypress.Commands.add('setNetworkConfigURL', (agoricNet) => {
  let networkConfigURL = '';

  if (agoricNet === 'xnet') {
    networkConfigURL = 'https://xnet.agoric.net/network-config';
  } else if (agoricNet === 'ollinet') {
    networkConfigURL = 'https://ollinet.agoric.net/network-config';
  } else if (agoricNet === 'emerynet') {
    networkConfigURL = 'https://emerynet.agoric.net/network-config';
  } else if (agoricNet === 'devnet') {
    networkConfigURL = 'https://devnet.agoric.net/network-config';
  } else if (agoricNet === 'local') {
    // UNTIL https://github.com/Agoric/wallet-app/issues/184
    networkConfigURL = 'https://wallet.agoric.app/wallet/network-config';
  } else {
    throw new Error('Unknown Agoric network specified');
  }

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
