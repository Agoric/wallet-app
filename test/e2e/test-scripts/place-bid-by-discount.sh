#!/bin/bash

run_script() {
    source ./test/e2e/test-scripts/common.sh

    commandToExecute="agd keys add $accountName --recover --keyring-backend=test"
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

    agops inter bid by-discount --discount 5 --give 2IST --from $accountAddress --keyring-backend=test | jq
    wait
}


run_script

