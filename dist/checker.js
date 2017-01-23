"use strict";
var ts = require("typescript");
var _ = require("lodash");
// Extract information about the type/error assertions in a source file.
// The scanner should be positioned at the start of the file.
function extractAssertions(scanner, source) {
    var assertions = [];
    var isFirstTokenOnLine = true;
    var lastLine = -1;
    while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) {
        var pos = scanner.getTokenPos();
        var line = source.getLineAndCharacterOfPosition(pos).line;
        isFirstTokenOnLine = (line !== lastLine);
        lastLine = line;
        if (scanner.getToken() === ts.SyntaxKind.SingleLineCommentTrivia) {
            var commentText = scanner.getTokenText();
            var m = commentText.match(/^\/\/ \$Expect(Type|Error) (.*)/);
            if (!m)
                continue;
            if (isFirstTokenOnLine) {
                line++; // the assertion applies to the next line.
            }
            var kind = m[1], text = m[2];
            if (kind === 'Type') {
                assertions.push({ kind: 'type', type: text, line: line });
            }
            else if (kind === 'Error') {
                assertions.push({ kind: 'error', pattern: text, line: line });
            }
        }
    }
    return assertions;
}
exports.extractAssertions = extractAssertions;
function attachNodesToAssertions(source, checker, assertions) {
    var nodedAssertions = [];
    // Match assertions to the first node that appears on the line they apply to.
    function collectNodes(node) {
        if (node.kind !== ts.SyntaxKind.SourceFile) {
            var pos = node.getStart();
            var line = source.getLineAndCharacterOfPosition(pos).line;
            var assertionIndex = _.findIndex(assertions, { line: line });
            if (assertionIndex >= 0) {
                var assertion = assertions[assertionIndex];
                var type = checker.getTypeAtLocation(node.getChildren()[0]);
                nodedAssertions.push({ node: node, assertion: assertion, type: type });
                assertions.splice(assertionIndex, 1);
            }
        }
        ts.forEachChild(node, function (node) { collectNodes(node); });
        return nodedAssertions;
    }
    collectNodes(source);
    if (assertions.length) {
        var prettyAssertions = assertions.map(function (assertion) {
            var msg;
            if (assertion.kind === 'type') {
                msg = "$ExpectType " + assertion.type;
            }
            else {
                msg = "$ExpectError " + assertion.pattern;
            }
            return "{assertion.line + 1}: " + msg;
        });
        console.error(JSON.stringify(prettyAssertions, null, '\t'));
        throw new Error('Unable to attach nodes to all assertions.');
    }
    return nodedAssertions;
}
exports.attachNodesToAssertions = attachNodesToAssertions;
function generateReport(checker, nodedAssertions, diagnostics) {
    var failures = [];
    var numSuccesses = 0;
    // Attach errors to nodes; if this isn't possible, then the error was unexpected.
    for (var _i = 0, diagnostics_1 = diagnostics; _i < diagnostics_1.length; _i++) {
        var diagnostic = diagnostics_1[_i];
        var line = diagnostic.file && diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line;
        var nodedAssertion = _.find(nodedAssertions, { assertion: { line: line } });
        if (nodedAssertion) {
            nodedAssertion.error = diagnostic;
        }
        else {
            var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            failures.push({
                type: 'UNEXPECTED_ERROR',
                line: line,
                message: message,
            });
        }
    }
    // Go through and check all the assertions.
    for (var _a = 0, nodedAssertions_1 = nodedAssertions; _a < nodedAssertions_1.length; _a++) {
        var noded = nodedAssertions_1[_a];
        var assertion = noded.assertion, type = noded.type, error = noded.error, node = noded.node;
        var line = assertion.line;
        var code = node.getText();
        // let base = { code, line };
        if (assertion.kind === 'error') {
            if (!error) {
                failures.push({
                    type: 'MISSING_ERROR',
                    line: line,
                    code: code,
                    message: assertion.pattern
                });
            }
            else {
                var message = ts.flattenDiagnosticMessageText(error.messageText, '\n');
                if (message.indexOf(assertion.pattern) === -1) {
                    failures.push({
                        type: 'WRONG_ERROR',
                        line: line,
                        code: code,
                        expectedMessage: assertion.pattern,
                        actualMessage: message,
                    });
                }
                else {
                    numSuccesses++;
                }
            }
        }
        else if (assertion.kind === 'type') {
            var actualType = checker.typeToString(type);
            if (actualType !== assertion.type) {
                failures.push({
                    type: 'WRONG_TYPE',
                    line: line,
                    code: code,
                    expectedType: assertion.type,
                    actualType: actualType,
                });
            }
            else {
                numSuccesses++;
            }
        }
    }
    failures.sort(function (a, b) { return a.line - b.line; });
    return { numSuccesses: numSuccesses, failures: failures };
}
exports.generateReport = generateReport;
/**
 * Check a single TypeScript source file for typings assertions and errors.
 *
 * The file passes the checks if report.failures.length === 0.
 */
function checkFile(source, scanner, checker, diagnostics) {
    var assertions = extractAssertions(scanner, source);
    var nodedAssertions = attachNodesToAssertions(source, checker, assertions);
    return generateReport(checker, nodedAssertions, diagnostics);
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = checkFile;
//# sourceMappingURL=checker.js.map