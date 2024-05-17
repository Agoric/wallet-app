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

Cypress.Commands.add('checkAuctionStatus', () => {
  cy.exec(`agops inter auction status`, { env: { AGORIC_NET } }).then(
    ({ stdout }) => {
      const output = JSON.parse(stdout);

      function checkFieldPresence(field) {
        const fieldValue = Cypress._.get(output, field);
        if (!fieldValue) {
          throw new Error(`Error: ${field} field is missing or empty`);
        }
      }

      checkFieldPresence('schedule.nextStartTime');
      checkFieldPresence('schedule.nextDescendingStepTime');

      checkFieldPresence('book0.startCollateral');
      checkFieldPresence('book0.collateralAvailable');

      checkFieldPresence('params.DiscountStep');
      checkFieldPresence('params.ClockStep');
      checkFieldPresence('params.LowestRate');

      cy.log('All required fields are present');
      return true;
    },
  );
});
