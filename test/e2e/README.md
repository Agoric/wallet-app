# Running End-to-End Tests

To run end-to-end test cases on your system, follow these steps:

1. **Install Dependencies:**
   Install the `@agoric/synpress` package as a dev dependency:

```bash
yarn add -D @agoric/synpress
```

2. **Start Local Agoric Chain**
   To begin a local instance of the Agoric Chain, execute the following Docker command:

```bash
docker run -d -p 26657:26657 -p 1317:1317 -p 9090:9090 ghcr.io/agoric/agoric-3-proposals:main
```

3. **Start Local Server:**
   Initiate the local server by running the following command:

```bash
yarn dev
```

4. **Run Test Cases:**
   Execute the test cases located in the `test/e2e/specs/test.spec.js` file:

```bash
yarn test:e2e
```

# Introduction to Cypress

Cypress is an open-source testing framework that allows developers to write automated tests for web applications. It provides a set of tools for writing, running, and debugging tests, all within the same environment.

## Writing Tests

- `describe`: Used to group related tests together.
- `context`: Similar to `describe`, used for grouping tests but can provide additional context or conditions.
- `it`: Defines an individual test case. Each `it` focuses on testing a specific aspect of the application.

## Common Commands

- `cy.visit()`: Navigates to a specific URL.
- `cy.get()`: Retrieves DOM elements based on selectors.
- `cy.contains()`: Finds elements containing specific text.
- `cy.click()`: Simulates mouse click events.
- `cy.type()`: Enters text into input fields.

## Commands for Interacting with Keplr

- `cy.setupWallet()`: Initializes Keplr by importing a wallet using a 24-word mnemonic phrase.
- `cy.acceptAccess()`: Establishes a connection with the wallet to grant access.
- `cy.confirmTransaction()`: Confirms and digitally signs transactions required during interactions with decentralized applications (dApps).
