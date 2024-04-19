#!/bin/bash

source ./test/e2e/test-scripts/common.sh

output=$(agops inter auction status)

checkFieldPresence "schedule.nextStartTime"
checkFieldPresence "schedule.nextDescendingStepTime"

checkFieldPresence "book0.startCollateral"
checkFieldPresence "book0.collateralAvailable"

checkFieldPresence "params.DiscountStep"
checkFieldPresence "params.ClockStep"
checkFieldPresence "params.LowestRate"

echo "All required fields are present"