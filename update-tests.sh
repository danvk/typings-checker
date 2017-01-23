#!/bin/bash
set -o errexit
tsc
set +o errexit

for test in $(find tests -name '*.ts'); do
  echo $test
  node src/index.js $test > $test.out 2>&1
  rc=${PIPESTATUS[0]}; if [[ $rc != 0 ]]; then exit $rc; fi
done

# This shows changes and sets the exit code.
set -o errexit
git status
git --no-pager diff -- tests
