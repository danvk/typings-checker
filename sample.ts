// Uncomment this to get some errors:
// let _: any;

// $ExpectType number
_.find([1, 2, 3], x => x * 1 == 3);
// $ExpectError Operator '==' cannot be applied to types 'number' and 'string'.
_.find([1, 2, 3], x => x == 'a');
// $ExpectType number
_.find([1, 2, 3], 1);
// $ExpectError Property 'y' does not exist on type '{ x: number; }'.
_.find([{x:1}, {x:2}, {x:3}], v => v.y == 3);
// $ExpectType { x: number; }
_.find([{x:1}, {x:2}, {x:3}], v => v.x == 3);

function f(x: {a: number}) {
  // $ExpectError Property 'b' does not exist
  return x.b;
}
