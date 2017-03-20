import chain from 'chain';

const v = chain([1, 2, 3])
  .filter(x => x % 2 === 0)
  .sum();

const v2 = chain([1, 2, 3])
  .map(x => '' + x)
  .sum();

const v3 = chain({a: 1, b: 2})
  .mapValues((val, k) => 2 * val)
  .map((val, k) => k + val)
  .sum();

const v4 = chain([1, 2, 3, 4])
  .map(v => ({val: v, sqr: v * v, str: '' + v}))
  .map('sqr')
  .sum();

const v5 = chain([1, 2, 3, 4])
  .map(v => ({val: v, sqr: v * v, str: '' + v}))
  .map('str')
  .value();

const v6 = chain([{a: 1}, {a: 2}, {a: 3, b: 2}, {a: 4, b: 1}])
  .filter((v, k) => 'b' in v)
  .map('b');  // oops! not an array of objects.

console.log(v, v2, v3, v4, v5);
