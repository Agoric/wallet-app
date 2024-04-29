import '@agoric/synpress/support/index';
import { AGORIC_NET } from './test.utils';

Cypress.Commands.add('addKeys', (params) => {
  const { keyName, mnemonic, expectedAddress } = params;
  const command = `echo ${mnemonic} | agd keys add ${keyName} --recover --keyring-backend=test`;

  cy.exec(command).then(({ stdout }) => {
    expect(stdout).to.contain(expectedAddress);
  });
});

Cypress.Commands.add('placeBidByPrice', (params) => {
  const { fromAddress, giveAmount, price } = params;
  const command = `agops inter bid by-price --from ${fromAddress} --give ${giveAmount} --price ${price} --keyring-backend=test`;

  cy.exec(command, { env: { AGORIC_NET } }).then(({ stdout }) => {
    expect(stdout).to.contain('Your bid has been accepted');
  });
});

Cypress.Commands.add('placeBidByDiscount', (params) => {
  const { fromAddress, giveAmount, discount } = params;

  const command = `agops inter bid by-discount --from ${fromAddress} --give ${giveAmount} --discount ${discount} --keyring-backend=test`;

  cy.exec(command, { env: { AGORIC_NET } }).then(({ stdout }) => {
    expect(stdout).to.contain('Your bid has been accepted');
  });
});
