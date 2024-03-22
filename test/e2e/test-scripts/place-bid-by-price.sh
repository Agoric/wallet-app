#!/bin/bash

source ./test/e2e/test-scripts/common.sh

commandToExecute="agd keys add $accountName --recover"
mnemonicPrompt="Enter your bip39 mnemonic"

expect -c "
    spawn $commandToExecute
    expect {
        \"override\" {
            send \"y\r\"
            exp_continue
        }
        \"$mnemonicPrompt\" {
            send \"$mnemonic\r\"
            exp_continue
        }
    }
"

agops inter bid by-price --give 1IST --price 8.55 --from $accountName | jq