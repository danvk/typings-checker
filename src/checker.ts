import * as ts from 'typescript';
import * as _ from 'lodash';
import { Assertion, TypeAssertion, ErrorAssertion, Failure, WrongTypeFailure, UnexpectedErrorFailure, WrongErrorFailure, MissingErrorFailure, NodedAssertion, Report } from './types';

// Extract information about the type/error assertions in a source file.
// The scanner should be positioned at the start of the file.
export function extractAssertions(scanner: ts.Scanner, source: ts.SourceFile): Assertion[] {
  const assertions = [] as Assertion[];

  let isFirstTokenOnLine = true;
  let lastLine = -1;

  while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) {
    const pos = scanner.getTokenPos();
    let { line } = source.getLineAndCharacterOfPosition(pos);
    isFirstTokenOnLine = (line !== lastLine);
    lastLine = line;

    if (scanner.getToken() === ts.SyntaxKind.SingleLineCommentTrivia) {
      const commentText = scanner.getTokenText();
      const m = commentText.match(/^\/\/ \$Expect(Type|Error) (.*)/);
      if (!m) continue;

      if (isFirstTokenOnLine) {
        line++;  // the assertion applies to the next line.
      }

      const [, kind, text] = m;
      if (kind === 'Type') {
        assertions.push({ kind: 'type', type: text, line });
      } else if (kind === 'Error') {
        assertions.push({ kind: 'error', pattern: text, line });
      }
    }
  }
  return assertions;
}

export function attachNodesToAssertions(
  source: ts.SourceFile,
  checker: ts.TypeChecker,
  assertions: Assertion[]
): NodedAssertion[] {
  const nodedAssertions = [] as NodedAssertion[];

  // Match assertions to the first node that appears on the line they apply to.
  function collectNodes(node: ts.Node) {
    if (node.kind !== ts.SyntaxKind.SourceFile) {
      const pos = node.getStart();
      const { line } = source.getLineAndCharacterOfPosition(pos);
      const assertionIndex = _.findIndex(assertions, {line});
      // console.warn(`checked for assertions at line ${line}: ${assertionIndex}`);
      if (assertionIndex >= 0) {
        const assertion = assertions[assertionIndex];
        const type = checker.getTypeAtLocation(node.getChildren()[0]);
        nodedAssertions.push({ node, assertion, type });
        assertions.splice(assertionIndex, 1);
      }
    }

    ts.forEachChild(node, node => { collectNodes(node); });
    return nodedAssertions;
  }

  collectNodes(source);
  if (assertions.length) {
    let prettyAssertions = assertions.map(o => {
      const errorMap: { [k: string]: string } = {
        type: `$ExpectType ${(<TypeAssertion>o).type}`,
        error: `$ExpectError ${(<ErrorAssertion>o).pattern}`,
      };
      let msg: string = <string> errorMap[o.kind];
      return `${o.line+1}: ${msg}`;
    });
    console.error(JSON.stringify(prettyAssertions, null, '\t'));
    throw new Error('Unable to attach nodes to all assertions.');
  }

  return nodedAssertions;
}

export function generateReport(
  checker: ts.TypeChecker,
  nodedAssertions: NodedAssertion[],
  diagnostics: ts.Diagnostic[],
): Report {
  const failures = [] as Failure[];
  let numSuccesses = 0;

  // Attach errors to nodes; if this isn't possible, then the error was unexpected.
  for (const diagnostic of diagnostics) {
    let line = diagnostic.file && diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line;

    const nodedAssertion = _.find(nodedAssertions, {assertion: {line}});
    if (nodedAssertion) {
      nodedAssertion.error = diagnostic;
    } else {
      let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      failures.push({
        type: 'UNEXPECTED_ERROR',
        line: line,
        message,
      })
    }
  }

  // Go through and check all the assertions.
  for (const {assertion, type, error} of nodedAssertions) {
    const line = assertion.line;
    if (assertion.kind === 'error') {
      if (!error) {
        failures.push({
          type: 'MISSING_ERROR',
          line,
          message: assertion.pattern
        });
      } else {
        const message = ts.flattenDiagnosticMessageText(error.messageText, '\n');
        if (message.indexOf(assertion.pattern) === -1) {
          failures.push({
            type: 'WRONG_ERROR',
            line,
            expectedMessage: assertion.pattern,
            actualMessage: message,
          });
        } else {
          numSuccesses++;
        }
      }
    } else if (assertion.kind === 'type') {
      const actualType = checker.typeToString(type);
      if (actualType !== assertion.type) {
        failures.push({
          type: 'WRONG_TYPE',
          line,
          expectedType: assertion.type,
          actualType,
        })
      } else {
        numSuccesses++;
      }
    }
  }

  failures.sort((a, b) => a.line - b.line);

  return { numSuccesses, failures };
}

/**
 * Check a single TypeScript source file for typings assertions and errors.
 *
 * The file passes the checks if report.failures.length === 0.
 */
export default function checkFile(
  source: ts.SourceFile,
  scanner: ts.Scanner,
  checker: ts.TypeChecker,
  diagnostics: ts.Diagnostic[]
): Report {
  const assertions = extractAssertions(scanner, source);
  const nodedAssertions = attachNodesToAssertions(source, checker, assertions);
  return generateReport(checker, nodedAssertions, diagnostics);
}
