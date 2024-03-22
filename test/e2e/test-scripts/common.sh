#!/bin/bash

# Common variables
export network=https://emerynet.rpc.agoric.net:443
export accountName="rabi-dev"
export mnemonic="orbit bench unit task food shock brand bracket domain regular warfare company announce wheel grape trust sphere boy doctor half guard ritual three ecology"
export AGORIC_NET=emerynet

# Function to check if field is present using jq
check_field_presence() {
  field_value=$(echo "$output" | jq -r ".$1")
  if [ -z "$field_value" ]; then
    echo "Error: $1 field is missing or empty"
    exit 1
  fi
}
