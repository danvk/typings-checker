# typings-checker

The [tests in DefinitelyTyped][1] verify that correct code type checks.
But this is an easy bar to meet: giving a module an `any` type is sufficient to make
its tests type check.

It's just as important that _incorrect_ code _not_ typecheck. There isn't any way to
test for this in DT right now. This repo provides a proof of concept for how this could
be added. It's modeleled after the way [FlowTyped][] handles things.

Here's what a test for `_.find` might look like:

```ts
_.find([1, 2, 3], x => x * 1 == 3);  // (this is just expected to type check)
// $ExpectError Operator '==' cannot be applied to types 'number' and 'string'.
_.find([1, 2, 3], x => x == 'a');
// $ExpectType number
_.find([1, 2, 3], 1);
// $ExpectError Property 'y' does not exist on type '{ x: number; }'.
_.find([{x:1}, {x:2}, {x:3}], v => v.y == 3);
// $ExpectType { x: number; }
_.find([{x:1}, {x:2}, {x:3}], v => v.x == 3);
```

Code is expected to type check unless an `$ExpectError` directive is used. In this case, an error is required (lack of an error from TypeScript is a test failure).

An `$ExpectType` directive tests the type of the expression on the next line. This prevents unexpected `any` or `{}` types from creeping in.

Usage:

```
$ npm install -g yarn ts-node
$ yarn
$ ts-node typecheck.ts sample.ts
Successes: 6
Failures: 0
```

[1]: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/0f756aca1642eaf49998565788caf18ef635271e/underscore/underscore-tests.ts
[FlowTyped]: https://github.com/flowtype/flow-typed/blob/a880b140e32d9d562abbe3924b2c10a583b3a6e1/definitions/npm/underscore_v1.x.x/test_underscore-v1.js