FROM ghcr.io/agoric/agoric-sdk:20240401190900-a3bdfb-linux_amd64

# Add the Agoric CLI to the PATH so that 'agops' can be accessed from anywhere in the command line.
ENV PATH="/usr/src/agoric-sdk/packages/agoric-cli/bin:${PATH}"

# Setup Node 18.18
RUN curl -sL https://deb.nodesource.com/setup_18.x | bash -
SHELL ["/bin/bash", "--login", "-c"]
ENV NODE_VERSION=18.18.0
ENV NVM_DIR /tmp/nvm
WORKDIR $NVM_DIR

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash \
  && . $NVM_DIR/nvm.sh \
  && nvm install $NODE_VERSION \
  && nvm alias default $NODE_VERSION \
  && nvm use default

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/v$NODE_VERSION/bin:$PATH

# Install necessary dependencies
RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates jq expect xvfb

# Install Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable

# Setup nginx
RUN apt update && apt install -y nginx
COPY test/e2e/nginx.conf /etc/nginx/sites-available/default

# Setup Wallet App
WORKDIR /app
COPY . .
RUN yarn install --frozen-lockfile
