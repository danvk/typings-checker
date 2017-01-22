#!/bin/bash
set -o errexit
tsc
set +o errexit

for test in $(find tests -name '*.ts'); do
  node src/index.js $test > $test.out 2>&1
done

# This shows changes and sets the exit code.
set -o errexit
git --no-pager diff -- tests

git status
if [ -n "$(git status --porcelain)" ]; then
  # this will catch a missing .ts.out file, for example.
  echo Unexpected changes
  exit 1
fi
