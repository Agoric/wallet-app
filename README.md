# Agoric Wallet Site

## Development

See [wallet/README.md](wallet/README.md)

## Production

### Manual testing

`yarn && yarn build && yarn preview`

### Deploying

https://wallet.agoric.app/ serves the latest build of the production branch.

To deploy, push to that branch. e.g. if you've qualified main:

`git push origin main:production`

# E2E Testing

E2E tests have been written in order to test the dapp as well as to perform automated testing on emerynet/devnet when upgrading the chain

There are two ways to run the tests:

## On Local Machine

### 1. Start the development server

To run tests on your local machine, first you need to start the development server:

```bash
yarn build && yarn preview
```

### 2. Ensure Keys are in Local Keyring

You need to ensure that the key `user1` is present in your local keyring. To find the mnemonic for this key, open the file `test/e2e/test.utils.js`. On `line 1` of this file, you will find an object named `mnemonics`, which contains the mnemonics for different keys, including `user1` and `user2`.

If you are going to run tests with `CYPRESS_AGORIC_NET=local`, use the mnemonic for `user1`. Otherwise, use the mnemonic for `user2`.

Regardless of which mnemonic you choose, make sure to name the key `user1` when adding it with the `agd` command.

**Note:** The test case for adding keys using `agd` from the CLI might fail. This is expected behavior and is fine when testing on your local machine.

### 3. Run the tests

Next, run the tests using the following command:

```bash
CYPRESS_AGORIC_NET=<network> yarn test:e2e
```

where `network` can be: `local`,`emerynet`,`devnet`, `xnet` or `ollinet`.

**Note:** The tests use chrome browser by default so they require it to be installed.

## On Github

To run the tests on github, you can use the workflow trigger to run the tests.

Go to: Actions > E2E Tests (On the left sidebar) > Run Workflow

It provides a handful of parameters that can be used to modify the run according to your needs

- `branch` you can change the branch on which the tests run
- `network` you can change the network on which to run the tests
