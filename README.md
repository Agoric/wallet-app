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

To run tests on your local machine, first you need to start the frontend server:

```
yarn build && yarn preview
```

Then you need to run the tests using

```
CYPRESS_AGORIC_NET=<network> yarn test:e2e
```

where `network` can be: `emerynet` or `devnet`

Note: the tests use chrome browser by default so they require it to be installed

## On Github

To run the tests on github, you can use the workflow trigger to run the tests.

Go to: Actions > E2E Tests (On the left sidebar) > Run Workflow

It provides a handful of parameters that can be used to modify the run according to your needs

- `branch` you can change the branch on which the tests run
- `network` you can change the network on which to run the tests
