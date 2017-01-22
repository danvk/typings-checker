const R = {
  isArrayLike(x: any) { return true; },
};

() => {
  // $ExpectType boolean
  R.isArrayLike('a');
  // $ExpectType boolean
  R.isArrayLike([1,2,3]);
  // $ExpectType boolean
  R.isArrayLike([]);
};
