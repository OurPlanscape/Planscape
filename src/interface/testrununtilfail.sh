#!/bin/bash

# Initialize a counter for successful test runs
success_count=0

while true; do
  # Run tests and capture output
  ng test --watch=false > temp-output.log 2>&1
  if [ $? -ne 0 ]; then
    # If tests fail, append the output to failed-tests.log
    echo "====================" >> failed-tests.log
    echo "Failure time: $(date)" >> failed-tests.log
    echo "Test output:" >> failed-tests.log
    cat temp-output.log >> failed-tests.log
    echo "====================" >> failed-tests.log
    echo "Tests failed. Check failed-tests.log for details."
    exit 1
  else
    # If tests pass, increment the success counter
    success_count=$((success_count + 1))
    echo "==== Ran test $success_count ==== passed at $(date)" >> failed-tests.log
    # Remove the temporary log file
    rm temp-output.log
  fi
done
