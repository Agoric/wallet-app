#!/bin/bash

run_script() {
    source ./test/e2e/test-scripts/common.sh

    commandToExecute="agd keys add $accountName --recover --keyring-backend=os"
    mnemonicPrompt="Enter your bip39 mnemonic"
    passphrasePrompt="keyring passphrase"

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
            \"$passphrasePrompt\" {
                send \"Test1234\r\"
                exp_continue
            }
        }
    "

    agops_output=$(agops inter bid by-price --give 1IST --price 8.55 --from $accountName | jq)

    expect_pid=$!
    wait $expect_pid

    if [[ $agops_output == *"Your bid has been accepted"* ]]; then
        echo "Success: Your bid has been accepted."
        echo "" >&2
        exit 0
    fi
}


run_script