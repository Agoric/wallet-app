#!/bin/bash

# Define the mnemonic
network=https://emerynet.rpc.agoric.net:443
accountName="rabi-dev"
mnemonic="silk praise pulse affair trigger mosquito stand action weapon next bottom peanut wish utility fork laugh grief journey unaware also canvas seminar merry suit"
export AGORIC_NET=emerynet

# Show your bid
echo "Show your bids..."
agops inter bid list --from $accountName


