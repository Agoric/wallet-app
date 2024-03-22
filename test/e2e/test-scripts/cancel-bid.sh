#!/bin/bash

# Define the mnemonic
## TODO:ENV 
network=https://emerynet.rpc.agoric.net:443
accountName="rabi-dev"
mnemonic="silk praise pulse affair trigger mosquito stand action weapon next bottom peanut wish utility fork laugh grief journey unaware also canvas seminar merry suit"
export AGORIC_NET=emerynet

echo "Fetching your bids..."
bidsOutput=$(agops inter bid list --from $accountName)
firstBidId=$(echo "$bidsOutput" | jq -r '.id')


if [ -z "$firstBidId" ]; then
    echo "You don't have any accepted bids."
else
    echo "Cancelling bid with ID: $firstBidId"
    agops inter bid cancel $firstBidId --from $accountName
    echo "Cancellation Successful"
fi


