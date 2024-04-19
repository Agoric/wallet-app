#!/bin/bash


source ./test/e2e/test-scripts/common.sh

agops inter bid by-discount --discount 5 --give 2IST --from $user2Address --keyring-backend=test 2>&1
wait