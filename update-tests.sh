#!/bin/bash
for test in $(find tests -name '*.ts'); do
  ./typecheck.ts $test > $test.out 2>&1
done

# This shows changes and sets the exit code.
set -o errexit
git status
git --no-pager diff -- tests
