#!/bin/bash


source ./test/e2e/test-scripts/common.sh

agops inter bid by-price --give 1IST --price 8.55 --from $accountAddress --keyring-backend=test 2>&1
wait
