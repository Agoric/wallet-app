#!/bin/bash

# Define the mnemonic
network=https://emerynet.rpc.agoric.net:443
accountName="rabi-dev"
mnemonic="orbit bench unit task food shock brand bracket domain regular warfare company announce wheel grape trust sphere boy doctor half guard ritual three ecology"
export AGORIC_NET=emerynet
echo "Adding Account.."

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

# Place a bid
echo "Placing Bid..."
agops inter bid by-discount --give 15IST --price 8.55 --from $accountName | jq