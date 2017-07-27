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
    .boolean('allow-expect-error')
    .describe('allow-expect-error',
              'Enable $ExpectError assertions. Setting this option means that ' +
              'it\'s possible for code to be accepted by typings-checker but not ' +
              'tsc.')
    .argv;

const tsFiles = argv._;
const { project } = argv;
const allowExpectError = argv['allow-expect-error'];

// read options from a tsconfig.json file.
// TOOD: make this optional, just like tsc.
const options: ts.CompilerOptions = ts.readConfigFile(project || 'tsconfig.json', ts.sys.readFile)
    .config.compilerOptions || {};
const host = ts.createCompilerHost(options, true);

const program = ts.createProgram(tsFiles, options, host);
let totalNumFailures = 0;
tsFiles.forEach((tsFile:string) => {
    const source = program.getSourceFile(tsFile);
    if (!source) {
      console.error(`could not load content of ${tsFile}`);
      process.exit(1);
    }
    const scanner = ts.createScanner(
        ts.ScriptTarget.ES5, false, ts.LanguageVariant.Standard, source.getFullText());

    const checker = program.getTypeChecker();
    const diagnostics = ts.getPreEmitDiagnostics(program);

    const typingsOptions = {
      allowExpectError,
    };

    const report = checkFile(source, scanner, checker, diagnostics, typingsOptions);
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
    totalNumFailures = totalNumFailures + numFailures;
});
process.exit(totalNumFailures);
