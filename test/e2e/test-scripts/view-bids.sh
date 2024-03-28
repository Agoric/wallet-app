#!/bin/bash

source ./test/e2e/test-scripts/common.sh

echo "Show your bids..."
agops inter bid list --from $accountAddress


