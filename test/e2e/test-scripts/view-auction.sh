#!/bin/bash

source ./test/e2e/test-scripts/common.sh

output=$(agops inter auction status)

# Check if schedule fields are present
check_field_presence "schedule.nextStartTime"
check_field_presence "schedule.nextDescendingStepTime"

# Check if book0 fields are present
check_field_presence "book0.startCollateral"
check_field_presence "book0.collateralAvailable"

# Check if params fields are present
check_field_presence "params.DiscountStep"
check_field_presence "params.ClockStep"
check_field_presence "params.LowestRate"

echo "All required fields are present"