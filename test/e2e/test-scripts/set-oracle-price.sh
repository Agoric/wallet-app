#!/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <price>"
    exit 1
fi

source ./test/e2e/test-scripts/common.sh


addKeyAndCheck "gov1" "$mnemonicGov1" "$gov1Address"
addKeyAndCheck "gov2" "$mnemonicGov2" "$gov2Address"

output=$(agops oracle setPrice --keys gov1,gov2 --pair ATOM.USD --price $1 --keyring-backend test)

if [ $? -eq 0 ]; then
    echo "Success: Price set to $1"
    exit 0
else
    echo "Command failed"
    echo "$output"
    exit 1
fi