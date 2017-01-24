// This file contains an error which is expected to be caught.

const x = {a: 'a', b: 2};
// $ExpectError Property 'c' does not exist
x.c

export default null;
