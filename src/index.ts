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
import * as _ from 'lodash';
import { scanAllTokens } from 'tslint';

const [,, tsFile] = process.argv;

// TODO: read options from a tsconfig.json file.
const options: ts.CompilerOptions = {};
const host = ts.createCompilerHost(options, true);

const program = ts.createProgram([tsFile], options, host);

const checker = program.getTypeChecker();

const source = program.getSourceFile(tsFile);
const scanner = ts.createScanner(
    ts.ScriptTarget.ES5, false, ts.LanguageVariant.Standard, source.getFullText());

interface TypeAssertion {
  kind: 'type';
  type: string;
  line: number;  // line that the assertion applies to; 0-based.
}

interface ErrorAssertion {
  kind: 'error';
  pattern: string;
  line: number;  // line that the assertion applies to; 0-based.
}

type Assertion = TypeAssertion | ErrorAssertion;

interface NodedAssertion {
  assertion: Assertion;
  node: ts.Node;
  type: ts.Type;
  error?: ts.Diagnostic;
}

const assertions = [] as Assertion[];
scanAllTokens(scanner, () => {
  if (scanner.getToken() === ts.SyntaxKind.SingleLineCommentTrivia) {
    const commentText = scanner.getTokenText();
    const m = commentText.match(/^\/\/ \$Expect(Type|Error) (.*)/);
    if (!m) return;

    const pos = scanner.getTokenPos();
    let { line } = source.getLineAndCharacterOfPosition(pos);
    line++;  // the assertion applies to the next line.

    const [, kind, text] = m;
    if (kind === 'Type') {
      assertions.push({ kind: 'type', type: text, line });
    } else if (kind === 'Error') {
      assertions.push({ kind: 'error', pattern: text, line });
    }
  }
});

// Attach ts.Nodes to the assertions.
function collectNodes(
  node: ts.Node,
  assertions: Assertion[],
  nodedAssertions: NodedAssertion[] = []
): NodedAssertion[] {
  if (node.kind >= ts.SyntaxKind.VariableStatement &&
      node.kind <= ts.SyntaxKind.DebuggerStatement) {
    const pos = node.getStart();
    const { line } = source.getLineAndCharacterOfPosition(pos);

    const assertionIndex = _.findIndex(assertions, {line});
    if (assertionIndex >= 0) {
      const assertion = assertions[assertionIndex];
      const type = checker.getTypeAtLocation(node.getChildren()[0]);
      nodedAssertions.push({ node, assertion, type });
      assertions.splice(assertionIndex, 1);
    }
  }

  ts.forEachChild(node, child => {
    collectNodes(child, assertions, nodedAssertions)
  });
  return nodedAssertions;
}

const nodedAssertions = collectNodes(source, assertions);

if (assertions.length) {
  console.error(assertions);
  throw new Error('Unable to attach nodes to all assertions.');
}

let allDiagnostics = ts.getPreEmitDiagnostics(program);

let numFailures = 0;
let numSuccesses = 0;

for (const diagnostic of allDiagnostics) {
  let { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

  const nodedAssertion = _.find(nodedAssertions, {assertion: {line}});
  if (nodedAssertion) {
    nodedAssertion.error = diagnostic;
  } else {
    let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    console.error(`${tsFile}:${line+1}: Unexpected error\n  ${message}`);
    numFailures++;
  }
}

for (const {assertion, type, error} of nodedAssertions) {
  const displayLine = assertion.line + 1;
  if (assertion.kind === 'error') {
    if (!error) {
      console.error(`${tsFile}:${displayLine}: Expected error ${assertion.pattern}\n`)
      numFailures++;
    } else {
      const message = ts.flattenDiagnosticMessageText(error.messageText, '\n');
      if (message.indexOf(assertion.pattern) === -1) {
        console.error(`${tsFile}:${displayLine}: Expected error\n  ${assertion.pattern}\nbut got:\n  ${message}\n`);
        numFailures++;
      } else {
        numSuccesses++;
      }
    }
  } else if (assertion.kind === 'type') {
    const typeString = checker.typeToString(type);
    if (typeString !== assertion.type) {
      console.error(`${tsFile}:${displayLine}: Expected type\n  ${assertion.type}\nbut got:\n  ${typeString}\n`);
      numFailures++;
    } else {
      numSuccesses++;
    }
  }
}

const numTotal = numSuccesses + numFailures;
console.log(`${tsFile}: ${numSuccesses} / ${numTotal} checks passed.`);

process.exit(numFailures);
