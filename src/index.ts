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

import { extractAssertions, attachNodesToAssertions, generateReport } from './checker';

const [,, tsFile] = process.argv;

// TODO: read options from a tsconfig.json file.
const options: ts.CompilerOptions = {};
const host = ts.createCompilerHost(options, true);

const program = ts.createProgram([tsFile], options, host);

const checker = program.getTypeChecker();

const source = program.getSourceFile(tsFile);
const scanner = ts.createScanner(
    ts.ScriptTarget.ES5, false, ts.LanguageVariant.Standard, source.getFullText());

const assertions = extractAssertions(scanner, source);
const nodedAssertions = attachNodesToAssertions(source, checker, assertions);

const diagnostics = ts.getPreEmitDiagnostics(program);
const report = generateReport(checker, nodedAssertions, diagnostics);

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
      message = `Expected error\n  ${failure.expectedMessage}\nbut got:\n  ${failure.actualMessage}`;
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
