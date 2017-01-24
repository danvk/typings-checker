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

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import * as yargs from 'yargs';

import checkFile from './checker';

const argv = yargs
    .usage('Usage: <file> [options]')
    .alias('p', 'project')
    .describe('p',
              'Path to the tsconfig.json file for your project. ' +
              'By default typings-checker looks in the directory in which it\'s run.')
    .boolean('allow-expect-error')
    .describe('allow-expect-error',
              'Enable $ExpectError assertions. Setting this option means that ' +
              'it\'s possible for code to be accepted by typings-checker but not ' +
              'tsc.')
    // version
    .alias('v', 'version')
    .version(() => require('../package').version)
    .describe('v', 'show version information')
    // help text
    .alias('h', 'help')
    .help('help')
    .usage('Usage: $0 [options] path/to/file.ts')
    .showHelpOnFail(false, 'Specify --help for available options')
    .strict()
    .argv;

const [tsFile] = argv._;
const { project } = argv;
const allowExpectError = argv['allow-expect-error'];

/**
 * Creates a TypeScript program object from a tsconfig.json file path.
 */
function createProgram(configFile: string): ts.Program {
  const projectDirectory = path.dirname(configFile);

  const { config } = ts.readConfigFile(configFile, ts.sys.readFile);
  const parseConfigHost: ts.ParseConfigHost = {
    fileExists: fs.existsSync,
    readDirectory: ts.sys.readDirectory,
    readFile: file => fs.readFileSync(file, 'utf8'),
    useCaseSensitiveFileNames: true,
  };
  const parsed = ts.parseJsonConfigFileContent(config, parseConfigHost, projectDirectory);
  const host = ts.createCompilerHost(parsed.options, true);
  const program = ts.createProgram(parsed.fileNames, parsed.options, host);

  return program;
}

// read options from a tsconfig.json file.
// TOOD: make this optional, just like tsc.
const program = createProgram(project || 'tsconfig.json');

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

process.exit(numFailures);
