// This file contains an error which is expected to be caught.
"use strict";
var x = { a: 'a', b: 2 };
// $ExpectError Property 'c' does not exist
x.c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = null;
