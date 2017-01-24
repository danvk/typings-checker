"use strict";
// This checks the types of parameters to a callback using inline assertions.
function mapObject(o, callback) {
    return {};
}
// $ExpectType { a: string; b: string; }
mapObject({ a: 1, b: 2 }, function (val, // $ExpectType number
    key, // $ExpectType "a" | "b"
    c) { return '' + val; });
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = null;
