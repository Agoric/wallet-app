#!/bin/bash


source ./test/e2e/test-scripts/common.sh

output=$(agops inter bid by-discount --discount 5 --give 2IST --from $accountAddress --keyring-backend=test | jq)
wait


if echo "$output" | grep -q "Your bid has been accepted"; then
    echo "Bid Placed Successfully"
    echo "" >&2
    exit 0
else
    echo "Error: $output" >&2
    exit 1
fi