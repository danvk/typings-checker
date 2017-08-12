#!/bin/bash
set -o errexit
node_modules/.bin/tsc
set +o errexit

for test in $(find tests -name '*.ts'); do
  echo $test
  node dist/index.js --allow-expect-error --project tests/tsconfig.json $test > $test.out 2>&1
done

echo "testing multiple files"
node dist/index.js --allow-expect-error --project tests/tsconfig.json $(find tests -name '*.ts') > tests/multiple.out 2>&1

# test wrong file path
node dist/index.js doesnt_exist.ts > tests/doesnt-exist.ts.out 2>&1

# This shows changes and sets the exit code.
set -o errexit
git --no-pager diff -- tests

git status
if [ -n "$(git status --porcelain)" ]; then
  # this will catch a missing .ts.out file, for example.
  echo Unexpected changes
  exit 1
fi
