function foo() {
  const x = <div>hello</div>;
  // $ExpectType JSX.Element
  x;
  return x;
}
