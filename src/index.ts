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
import * as yargs from 'yargs';

import checkFile from './checker';

const argv = yargs
    .usage('Usage: <file> [options]')
    .alias('p', 'project')
    .describe('p', 'Path to the tsconfig.json file for your project')
    .argv;

const [tsFile] = argv._;
const { project } = argv;

// read options from a tsconfig.json file.
// TOOD: make this optional, just like tsc.
const options: ts.CompilerOptions = ts.readConfigFile(project || 'tsconfig.json', ts.sys.readFile)
    .config.compilerOptions || {};
const host = ts.createCompilerHost(options, true);

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
  const { line } = failure;
  let message: string;
  switch (failure.type) {
    case 'UNEXPECTED_ERROR':
      message = `Unexpected error\n  ${failure.message}`;
      break;
    case 'MISSING_ERROR':
      message = `Expected error ${failure.message}`;
      break;
    case 'WRONG_ERROR':
      message = `Expected error\n  ${failure.expectedMessage
          }\nbut got:\n  ${failure.actualMessage}`;
      break;
    case 'WRONG_TYPE':
      message = `Expected type\n  ${failure.expectedType}\nbut got:\n  ${failure.actualType}`;
      break;
  }
  console.error(`${tsFile}:${line + 1}: ${message}\n`);
}

const numFailures = report.failures.length;
const numTotal = report.numSuccesses + numFailures;
console.log(`${tsFile}: ${report.numSuccesses} / ${numTotal} checks passed.`);

process.exit(numFailures);
