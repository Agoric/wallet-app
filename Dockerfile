FROM node:18.6

# Install chrome and necessary dependencies
RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates jq \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable


# Project setup
RUN mkdir /app
WORKDIR /app
COPY . .

RUN yarn install --frozen-lockfile