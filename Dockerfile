FROM node:18.18

# Install necessary packages
RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates jq expect \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable

# Setup Golang
COPY --from=golang:1.21 /usr/local/go/ /usr/local/go/
ENV PATH="/usr/local/go/bin:${PATH}"
ENV GOPATH="/go"
ENV GOBIN="/go/bin"

# Agoric SDK Setup
WORKDIR /agoric-app
RUN git clone https://github.com/Agoric/agoric-sdk.git && \
    cd agoric-sdk && \
    yarn && \
    yarn build && \
    yarn link-cli ~/bin/agoric && \
    cd packages/cosmic-swingset && \
    make && \
    cd ../.. && \
    ./bin/agd build

ENV PATH="/agoric-app/agoric-sdk/bin:${PATH}"

# Setup Wallet App
WORKDIR /app
COPY . .
RUN yarn install --frozen-lockfile
