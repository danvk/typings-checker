# A typed chain: exploring the limits of TypeScript's type system

- What does lodash's `_.chain()` do? Why is typing it helpful?
  - Auto-closing chains (with which methods?)
  - What do `map`, `filter` do for object types?
  - Which methods make sense in this context? What's my type now?
  - Mention: pipe operator proposal
- Implementation of `chain` in VanillaJS.
- Why can't this be written in TypeScript?
  - Benefit of typings for implementation vs. for user.
- Separate type definitions
  1. Straightforward `WrappedValue<T>`. Problems.
  1. `WrappedValue<T>` and `WrappedArray<T>`.
  1. `WrappedObject<T>` (this is what TS 2.2's `object` is for!)
  1. `WrappedArrayOfObjects<T>`.
  1. What would solve this? Specializations based on shape.
- Aside: testing type definition files. When can they use new language features?
- Conclusion
  - This will likely be solved with a power-user feature.
  - ... but ordinary users will benefit.
  - The TS team has done a great job in the past of finding general, usable solutions to problems like these.

In my [last post][typed-pluck], I looked at how some of TypeScript's new features made it possible to correctly type Underscore.js's [`pluck` method][pluck]. In this post, I'll try to do the same for its [`chain` method][chain]. In the process, we'll run up against some limitations of TypeScript and its type declaration language. We'll also make use of another one of TypeScript's newest features: the (lowercase) `object` type, which [made its debut][ts22] in TypeScript 2.2.

Underscore and lodash's `chain` methods solve a simple problem: we in the LTR language-speaking community think of data as flowing from left to right and top to bottom, but function composition syntax goes the opposite way:

```
f5(f4(f3(f2(f1(x)))))  // f1 is written last but applied first.
```

The `chain` method uses method chaining to invert this. Each operation returns a new wrapped object, which you then unwrap at the end:

```
_.chain(x)
 .f1()
 .f2()
 .f3()
 .f4()
 .f5()
 .value();
```

(In practice the functions are `map`, `filter`, `reduce`, `groupBy` and friends.)

This reads more clearly, but it has a few downsides:

1. It's more verbose (you need to add the `_.chain` and `.value()`).
1. It's easy to lose track of what your data looks like as you go through the chain.
1. It's easy to forget the `.value()`.

lodash has a partial answer to the missing `.value()` issue: some methods *auto-close* the chain. There are [**153** of these methods][non-chainable], but good luck remembering which ones they are! Do you need to vall `.value()` or not? This is the sort of thing that static analysis can help with.

(Side note: there's a [proposal][pipe] to add a `|>` *pipe operator* to EcmaScript to solve this problem in the language itself. I think it's a great idea!)

Let's start with a quick implementation of something like `chain`, in [VanillaJS][]:

```js
class WrappedValue {
  constructor(obj) {
    this.v = obj;
  }

  filter(fn) {    this.v = this.v.filter(fn);    return this; }
  reduce(fn, x) { this.v = this.v.reduce(fn, x); return this; }
  map(fn) {
    if (typeof(fn) === 'string') {
      this.v = this.v.map(v => v[fn]);
    } else {
      this.v = this.v.map(fn);
    }
    return this;
  }
  mapValues(fn) {
    for (const k in this.v) { this.v[k] = fn(this.v[k], k); }
    return this;
  }
  sum(fn) {
    return this.reduce((a, b) => a + b, 0).value();  // auto-close
  }
  value() {
    return this.v;
  }
}

function chain(obj) {
  return new WrappedValue(obj);
}
```

A few notes:

- It's implemented using an ES6 class and the native `map` and `reduce` functions.
- The `sum` method closes the chain.
- The `mapValues` method that only really makes sense for objects, not arrays. With an array you should use plain old `map`.
- The `map` function acts like `pluck` if you pass a string argument. ([This is really how lodash works!][whither-pluck])

*(Note: this isn't at all how LoDash's implicit chain is implemented. It uses lazy evaluation to get some nice optimizations.)*

Once we try to add types to this implementation, though, we quickly run into some issues. Here's a quick try at `map`:

```ts
class WrappedValue<T> {
  constructor(private v: T) {}

  // Note awkward type signature.
  map<U>(fn: (v: T[keyof T], k: string) => U) {
    return new WrappedValue(this.v.map(fn));
    //                             ~~~
    // [ts] Property 'map' does not exist on type 'T'.
  }
}
```

Ideally we'd like to only provide a `map` method if the wrapped value is an array or object type. But, just like VanillaJS, TypeScript doesn't support method overloading. More generally, [it doesn't generate code that depends on types][typeless-gen].

So what can we do? Unless we're willing to use lots of opaque `any` types, we're going to have a hard time implementing `chain` in TypeScript. But there is another option: we can implement it in VanillaJS and write a separate type declaration file.

## Writing a type declarations file

Type declarations provide two related benefits:

1. They verify that function implementations pass static analysis and match their declared types.
1. They facilitate static analysis for their callers by specifying input and output types.

When we implement our functions in TypeScript, we get both of these benefits. When we use a type declaration file, we only get the second. But that's the most important one. You care about your users more than yourself, right?

*(Aside: type inference blurs these lines. But unless you love [C++ template errors][stl], it's a good idea to write explicit return types on your exported functions!)*

The upside of writing a separate type definition file is that it gives us more flexibility. Unlike TypeScript implementation files, type definition files *do* let you overload functions. This is just what we need to get going on `chain`. Here's a first try:

```ts
declare module 'chain' {
  interface WrappedValue<T> {
    value(): T;
  }
  interface WrappedArray<T> extends WrappedValue<T[]> {
    map<U>(fn: (x: T, i: number) => U): WrappedArray<U>;
    filter(fn: (x: T, i: number) => boolean): WrappedArray<T>;
    reduce<U>(fn: (acc: U, v: T) => U, base: U): WrappedValue<U>;
  }
  function chain<T>(obj: T[]): WrappedArray<T>;
  function chain<T>(obj: T): WrappedValue<T>;
}
```

Note the defining characteristic of a type definition file: none of these methods have implementations. Overloading lets us introduce the distinction between wrapped values and wrapped arrays that was missing in our TypeScript implementation. We can verify that this works by checking a few types in vscode:

...add screenshot

What if we wanted to add the `sum` method? Here's a try:

```ts
interface WrappedArray<T> extends WrappedValue<T[]> {
  sum(): T;  // ideally this would only work for string or number.
}
```

This will let you sum an array of numbers to a single number or concatenate an array of strings to a single string. Great! And it will auto-close the chain. Even better! But it will also let you sum an array of Dates to a single Date and an array of regular expressions to a single regex. This doesn't match the function's behavior. Ideally we'd only allow `sum` for wrapped numbers and strings.

The simplest way to do this would be to specialize `WrappedArray<number>` and `WrappedArray<string>`. But it's [not possible to do this in TypeScript][specialization]. Here's another workaround:

```ts
interface WrappedArray<T> extends WrappedValue<T[]> {
  map(fn: (x: T, i: number) => number): WrappedArrayOfNumbers;
  map<U>(fn: (x: T, i: number) => U): WrappedArray<U>;
}
interface WrappedArrayOfNumbers extends WrappedArray<number> {
  sum(): number;
}
function chain(obj: number[]): WrappedArrayOfNumbers;
```

Here we try to detect every way you could make an array of numbers and override it to return a distinct type. We'd have to do this with `WrappedArrayOfStrings`, too. This is a lot of work to get a more precise type definition! And we can't be confident we've covered every way to get a wrapped list of numbers. But it's [exactly how the lodash typings work][ld-num-array].

It's a bit frustrating that TypeScript doesn't provide a facility for doing specialization. However you arrive at a type, TypeScript knows it! It's a shame that we have to hack around the missing feature like this.

## Wrapped objects

We can use a trick like this the one above add support for `mapValues`:

```ts
interface WrappedObject<T> extends WrappedValue<T> {
  mapValues<K extends keyof T, U>(fn: (v: T[K], k: K) => U): WrappedObject<{[k in keyof T]: U}>;
  map<K extends keyof T, U>(fn: (x: T[K], k: K) => U): WrappedArray<U>;
  filter<K extends keyof T>(fn: (x: T[K], k: K) => boolean): WrappedArray<T[K]>;
}

interface WrappedArray<T> extends WrappedValue<T[]> {
  reduce<U extends object>(fn: (acc: U, v: T) => U, base: U): WrappedObject<U>;
}

function chain<T>(obj: T[]): WrappedArray<T>;
function chain<T extends object>(obj: T): WrappedObject<T>;
function chain<T>(obj: T): WrappedValue<T>;
```

Here we've introduced a new type, `WrappedObject`, and specialized some of the chainable methods on it. `mapValues` is specific to objects (not arrays; if you have an array then you should use `map`). And `map` and `filter` have different behaviors for objects (they make them into arrays):

... screenshot of vscode deducing the type for `.map`.

This also introduces the `object` type, which is [new in TypeScript 2.2][ts22]. It's a type which includes any non-primitive value. A string isn't part of `object`, but an array and a structure are. Here we use `object` to create a specialized chain for types which have keys and values. Arrays are still handled specially, but so are objects. It's not entirely clear to me why you'd want to wrap a primitive, but that's the fallback.

## Adding pluck / map

What about the specialized version of `map` for arrays of objects, which acts like [`_.pluck`][pluck]?

```ts
_([{a: 1}, {a: 2}, {a: 3}]).map('a').value()
// [1, 2, 3]
```

This only makes sense for arrays of objects. So we'll need to specialize to include those as well:

```ts
interface WrappedArrayOfObjects<U> extends WrappedArray<U> {
  map<K extends keyof U>(fn: K): WrappedArray<U[K]>;
  filter(fn: (x: U, i: number) => boolean): WrappedArrayOfObjects<U>;
}

interface WrappedArray<T> extends WrappedValue<T[]> {
  map<U extends object>(fn: (x: T, i: number) => U): WrappedArrayOfObjects<U>;
}

function chain<T extends object>(obj: T[]): WrappedArrayOfObjects<T>;
function chain<T>(obj: T[]): WrappedArray<T>;
function chain<T extends object>(obj: T): WrappedObject<T>;
function chain<T>(obj: T): WrappedValue<T>;
```

A few things to note:

- We've introduced a new `WrappedArrayOfObjects` interface with a specialized `map` method.
- The specialized `map` method uses `keyof` and index types so it's actually pretty smart! Plucking a non-existent key will be an error.
- We support two ways of creating `WrappedArrayOfObjects` instances: directly via the `chain` function, and by mapping from values in an array to objects.

Here are a few examples of this in action:

... screenshot of chains involving specialized `map`.

This works well for the cases we've covered. But there are other ways to get an array of objects. Maybe you have an array of nested objects and you pull out a subfield. In this case, we'd need a `WrappedArrayOfObjectsOfObjects` type. But clearly this is madness. We'll never be able to model every way to produce an array of objects in this manner.

So `WrappedArrayOfObjects` isn't deep enough. And this is already deeper than the underscore typings go (they include [chained arrays and objects][u-chain-array]), and even deeper than the 20,000-line lodash typings (which include [`LoDashExplicitNumberArrayWrapper`][ld-num-array]!).

*aside on typings-checker goes here?*

## Conclusion

Using a type definitions file gets us close to correct types for `_.chain` but it still leaves some unpleasant gaps.

Hopefully the TypeScript team will find a good way to incorporate specialization into type declarations. I filed [TypeScript#13852][specialization] to track it. It's an advanced feature that most TS users will never touch. But they will appreciate higher-quality typings for libraries like Underscore and LoDash.

[typed-pluck]: https://medium.com/@danvdk/a-typed-pluck-exploring-typescript-2-1s-mapped-types-c15f72bf4ca8
[ts22]: https://github.com/Microsoft/TypeScript/wiki/What's-new-in-TypeScript#object-type
[vanillajs]: http://vanilla-js.com/
[typeless-gen]: http://neugierig.org/software/blog/2016/04/typescript-types.html
[specialization]: https://github.com/Microsoft/TypeScript/issues/13852
[u-chain-array]: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/e6a0a9f288cff4b2bb2e59cdabc629c4cf6962f6/underscore/index.d.ts#L6088-L6091
[ld-num-array]: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/e6a0a9f288cff4b2bb2e59cdabc629c4cf6962f6/lodash/index.d.ts#L410-L412
[pluck]: http://underscorejs.org/#pluck
[chain]: http://underscorejs.org/#chain
[non-chainable]: https://lodash.com/docs/#lodash
[pipe]: https://github.com/mindeavor/es-pipeline-operator
[whither-pluck]: http://stackoverflow.com/questions/35136306/what-happened-to-lodash-pluck
[stl]: https://tgceec.tumblr.com/post/74534916370/results-of-the-grand-c-error-explosion
