#!/usr/bin/env node
/**
 * This script reads a TypeScript file and verifies that it produces the expected types and errors.
 *
 * Usage:
 *
 *     typings-checker yourtsfile.ts
 *
 * The exit code indicates whether all assertions passed.
 */

import * as ts from 'typescript';
let argv = require('yargs')
  .usage('Usage: <file> [options]')

  .alias('l', 'noLines')
  .describe('l', 'skip line numbers in output to keep it more diff-friendly')

  .alias('v', 'verbose')
  .describe('v', 'also print relevant code')

  .argv;

import checkFile from './checker';

const [tsFile] = argv._;
const { noLines, verbose } = argv;

// read options from a tsconfig.json file.
let host = ts.createCompilerHost({}, true);
const options: ts.CompilerOptions = ts.readConfigFile('tsconfig.json', (path: string) => host.readFile(path)).config['compilerOptions'];
// console.log(options);
if (options) {
  host = ts.createCompilerHost(options, true);
}

const program = ts.createProgram([tsFile], options, host);

const source = program.getSourceFile(tsFile);
if (!source) {
  console.error(`could not load content of ${tsFile}`);
  process.exit(1);
}
const scanner = ts.createScanner(
    ts.ScriptTarget.ES5, false, ts.LanguageVariant.Standard, source.getFullText());

const checker = program.getTypeChecker();
const diagnostics = ts.getPreEmitDiagnostics(program);

const report = checkFile(source, scanner, checker, diagnostics);

for (const failure of report.failures) {
  const { line, code } = failure;
  let message: string;
  switch (failure.type) {
    case 'UNEXPECTED_ERROR':
      message = `Unexpected error\n  ${failure.message}`;
      break;
    case 'MISSING_ERROR':
      message = `Expected error ${failure.message}`;
      break;
    case 'WRONG_ERROR':
      message = `Expected error\n  ${failure.expectedMessage}\nbut got:\n  ${failure.actualMessage}`;
      break;
    case 'WRONG_TYPE':
      message = `Expected type\n  ${failure.expectedType}\nbut got:\n  ${failure.actualType}`;
      break;
  }
  console.error(`${tsFile}:${noLines ? '' : ((line + 1) + ':')}${verbose && code ? code + '\n' : ''}\n${message}\n`);
}

const numFailures = report.failures.length;
const numTotal = report.numSuccesses + numFailures;
console.log(`${tsFile}: ${report.numSuccesses} / ${numTotal} checks passed.`);

process.exit(numFailures);
