#!/usr/bin/env node
"use strict";
var ts = require("typescript");
// import * as _ from 'lodash';
var checker_1 = require("./checker");
var _a = process.argv, tsFile = _a[2];
// read options from a tsconfig.json file.
var options = ts.readConfigFile('tsconfig.json', ts.sys.readFile).config['compilerOptions'] || {};
// const omittedOptions = ['lib']; // compiler options it tends to not like
// options = <ts.CompilerOptions> _.omit(options, omittedOptions);
var host = ts.createCompilerHost(options, true);
var program = ts.createProgram([tsFile], options, host);
var source = program.getSourceFile(tsFile);
if (!source) {
    console.error("could not load content of " + tsFile);
    process.exit(1);
}
var scanner = ts.createScanner(ts.ScriptTarget.ES5, false, ts.LanguageVariant.Standard, source.getFullText());
var checker = program.getTypeChecker();
var diagnostics = ts.getPreEmitDiagnostics(program);
var report = checker_1.default(source, scanner, checker, diagnostics);
for (var _i = 0, _b = report.failures; _i < _b.length; _i++) {
    var failure = _b[_i];
    var line = failure.line, code = failure.code;
    var message = void 0;
    switch (failure.type) {
        case 'UNEXPECTED_ERROR':
            message = "Unexpected error\n  " + failure.message;
            break;
        case 'MISSING_ERROR':
            message = "Expected error " + failure.message;
            break;
        case 'WRONG_ERROR':
            message = "Expected error\n  " + failure.expectedMessage + "\nbut got:\n  " + failure.actualMessage;
            break;
        case 'WRONG_TYPE':
            message = "Expected type\n  " + failure.expectedType + "\nbut got:\n  " + failure.actualType;
            break;
    }
    console.error(tsFile + ":" + (line + 1) + ":" + (code ? code + '\n\n' : ' ') + message + "\n");
}
var numFailures = report.failures.length;
var numTotal = report.numSuccesses + numFailures;
console.log(tsFile + ": " + report.numSuccesses + " / " + numTotal + " checks passed.");
process.exit(numFailures);
//# sourceMappingURL=index.js.map