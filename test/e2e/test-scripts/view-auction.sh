#!/bin/bash

source ./test/e2e/test-scripts/common.sh

output=$(agops inter auction status)

check_field_presence "schedule.nextStartTime"
check_field_presence "schedule.nextDescendingStepTime"

check_field_presence "book0.startCollateral"
check_field_presence "book0.collateralAvailable"

check_field_presence "params.DiscountStep"
check_field_presence "params.ClockStep"
check_field_presence "params.LowestRate"

echo "All required fields are present"