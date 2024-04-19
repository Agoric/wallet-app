#!/bin/bash

source ./test/e2e/test-scripts/common.sh
addKeyAndCheck "user1" "$mnemonicUser2" "$user2Address"
wait