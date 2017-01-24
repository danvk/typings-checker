function foo() {
    var x = React.createElement("div", null, "hello");
    // $ExpectType JSX.Element
    x;
    return x;
}
