var R = {
    isArrayLike: function (x) { return true; },
};
(function () {
    // $ExpectType boolean
    R.isArrayLike('a');
    // $ExpectType boolean
    R.isArrayLike([1, 2, 3]);
    // $ExpectType boolean
    R.isArrayLike([]);
});
