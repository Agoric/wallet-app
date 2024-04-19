#!/bin/bash

source ./test/e2e/test-scripts/common.sh

agops inter bid list --from $user2Address --keyring-backend=test 2>&1
wait