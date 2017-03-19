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

console.log(v, v2, v3);
