FROM ghcr.io/agoric/agoric-sdk:latest
# Add the Agoric CLI to the PATH so that 'agops' can be accessed from anywhere in the command line.
ENV PATH="/usr/src/agoric-sdk/packages/agoric-cli/bin:${PATH}"

# Recent e2e test failures for all dApps were due to inconsistent network configurations in the CI setup.
# GitHub Actions infrastructure can resolve localhost inconsistently (IPv4 or IPv6).
# To address this, we set NODE_OPTIONS=--dns-result-order=ipv4first to prioritize IPv4 DNS resolution.
# For more details, see: https://github.com/cypress-io/cypress/issues/27962
ENV NODE_OPTIONS=--dns-result-order=ipv4first

# Install necessary dependencies
RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates jq expect xvfb

# Install Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable

# Setup Wallet App
WORKDIR /app
COPY . .
RUN yarn install --frozen-lockfile
