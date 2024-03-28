FROM --platform=linux/amd64 synthetixio/docker-e2e:18.16-ubuntu as base

RUN apt-get update \
    && apt-get install -y jq expect 

# Setup Golang
COPY --from=golang:1.21 /usr/local/go/ /usr/local/go/
ENV PATH="/usr/local/go/bin:${PATH}"
ENV GOPATH="/go"
ENV GOBIN="/go/bin"

# Agoric SDK Setup
WORKDIR /agoric-app
RUN git clone https://github.com/Agoric/agoric-sdk.git && \
    cd agoric-sdk && \
    git reset --hard baa6382618c81417b593d3806341f1d790726462 && \
    yarn && \
    yarn build && \
    yarn link-cli ~/bin/agoric && \
    cd packages/cosmic-swingset && \
    make && \
    cd ../.. && \
    ./bin/agd build

ENV PATH="/agoric-app/agoric-sdk/packages/agoric-cli/bin:/agoric-app/agoric-sdk/bin:${PATH}"
EXPOSE 26657

# Setup Wallet App
WORKDIR /app
COPY . .
RUN yarn install --frozen-lockfile
