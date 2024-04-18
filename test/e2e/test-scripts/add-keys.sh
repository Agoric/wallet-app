#!/bin/bash


source ./test/e2e/test-scripts/common.sh

commandToExecute="agd keys add $accountName --recover --keyring-backend=test"
mnemonicPrompt="Enter your bip39 mnemonic"

expectOutput=$(expect -c "
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
")

if [[ $expectOutput == *$accountAddress* ]]; then
    echo "Keys added successfully"
    exit 0
else
    echo "Error: $expectOutput" >&2
    exit 1
fi