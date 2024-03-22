#!/bin/bash

source common.sh

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


