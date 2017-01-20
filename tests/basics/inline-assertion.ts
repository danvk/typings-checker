// This checks the types of parameters to a callback using inline assertions.

function mapObject<T, U>(
  o: T,
  callback: (val: T[keyof T], key: keyof T, collection: T) => U
): {[k in keyof T]: U} {
  return {} as any;
}

// $ExpectType { a: string; b: string; }
mapObject({a: 1, b: 2}, (
  val,  // $ExpectType number
  key,  // $ExpectType "a" | "b"
  c,  // $ExpectType { a: number; b: number; }
) => '' + val);
