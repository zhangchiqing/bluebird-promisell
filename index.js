'use strict';

var Promise = require('bluebird');

//# purep :: a -> Promise a
//.
//. Takes any value, returns a resolved Promise with that value
//.
//. ```js
//. > purep(3).then(console.log)
//. promise
//. 3
//. ```
exports.purep = function(a) {
  return Promise.resolve(a);
};

// apply :: (a -> b ... -> n -> x) -> [a, b ... n] -> x
var apply = function(fn) {
  return function(args) {
    return fn.apply(this, args);
  };
};

var curry2 = function(fn) {
  return function (a, b) {
    if (b === undefined) {
      return function(b, c) {
        if (c === undefined) {
          return fn(a, b);
        } else {
          return fn(a, b)(c);
        }
      };
    } else {
      return fn(a, b);
    }
  };
};

// id :: a -> a
var id = function(a) {
  return a;
};

// always :: a -> b -> a
// > always(1, 2)
// 1
// > always(1)(2)
// 1
// > always(id)(1, 2)
// 2
// > always(id)(1)(2)
// 2
var always = curry2(id);

var slice = Array.prototype.slice;

var toArray = function(a) {
  return slice.call(a);
};

var fold = function(iter, initial, arr) {
  if (!arr.length) {
    return initial;
  }

  var newInitial = iter(initial, arr[0]);
  return fold(iter, newInitial, slice.call(arr, 1));
};

var map = function(f) {
  return function(arr) {
    return fold(function(memo, item) {
      return memo.concat([f(item)]);
    }, [], arr);
  };
};

// > filter(function(x) { return x > 0; })([1,2,-1])
// [1,2]
var filter = function(f) {
  return function(arr) {
    return fold(function(memo, value) {
      if (f(value)) {
        return memo.concat([value]);
      } else {
        return memo;
      }
    }, [], arr);
  };
};

var pipe = function() {
  var fns = toArray(arguments);
  return function(a) {
    return fold(function(acc, fn) {
      return fn(acc);
    }, a, fns);
  };
};

//# fmapp :: (a -> b) -> Promise a -> Promise b
//
//. Transforms a Promise of value a into a Promise of value b
//
//. ```js
//. > fmapp(function(a) { return a + 3; }, Promise.resolve(4)).then(console.log)
//. promise
//. 7
//. ```
exports.fmapp = function(fn) {
  return function(p) {
    return p.then(fn);
  };
};


//# sequencep :: Array Promise a -> Promise Array a
//
//. Transforms an array of Promise of value a into a Promise of array of a.
//
//. ```js
//. > sequencep([Promise.resolve(3), Promise.resolve(4)]).then(console.log)
//. promise
//. [3, 4]
//. ```
exports.sequencep = function(arr) {
  return Promise.all(arr);
};

//# traversep :: (a -> Promise b) -> Array a -> Promise Array b
//
//. Maps a function that takes a value a and returns a Promise of value b over an array of value a,
//. then use `sequencep` to transform the array of Promise b into a Promise of array b
//
//. ```js
//. > traversep(function(a) { return Promise.resolve(a + 3); })(
//.     [2, 3, 4])
//. promise
//. [5, 6, 7]
//. ```
exports.traversep = function(fn) {
  return pipe(map(fn), exports.sequencep);
};

//# pipep :: [(a -> Promise b), (b -> Promise c), ... (m -> Promise n)] -> a -> Promise n
//
//. Performs left-to-right composition of an array of Promise-returning functions.
//
//. ```js
//. > pipep([
//.     function(a) { return Promise.resolve(a + 3); },
//.     function(b) { return Promise.resolve(b * 10); },
//.   ])(6);
//. promise
//. 90
//. ```
exports.pipep = function(pipes) {
  return function(a) {
    return fold(function(accp, fn) {
      return accp.then(fn);
    }, exports.purep(a), pipes);
  };
};

//# liftp :: (a -> b -> ... n -> x)
//         -> Promise a -> Promise b -> ... -> Promise n
//         -> Promise x
//
//. Takes a function, which takes n arguments and return a value x, and n Promises,
//. return a Promise of value x
//
//. ```js
//. > liftp(function(a, b, c) { return (a + b) * c; })(
//.     Promise.resolve(3),
//.     Promise.resolve(4),
//.     Promise.resolve(5))
//. promise
//. 35
//. ```
exports.liftp = function(fn) {
  return function() {
    return exports.fmapp(apply(fn))(exports.sequencep(toArray(arguments)));
  };
};

//# firstp :: Promise a -> Promise b -> Promise a
//
//. Takes two Promises and return the first if both of them are resolved
//. alias <* firstp
//
//. ```js
//. > firstp(Promise.resolve(1), Promise.resolve(2))
//. promise
//. 1
//
//. > firstp(Promise.resolve(1), Promise.reject(new Error(3)))
//. promise
//. Error 3
//. ```
exports.firstp = exports.liftp(always);

//# secondp :: Promise a -> Promise b -> Promise b
//
//. Takes two Promises and return the second if both of them are resolved
//. alias *> secondp
//
//. ```js
//. > secondp(Promise.resolve(1), Promise.resolve(2))
//. promise
//. 2
//
//. > secondp(Promise.resolve(1), Promise.reject(new Error(3)))
//. promise
//. Error 3
//. ```
exports.secondp = exports.liftp(always(id));

//# filterp :: (a -> Boolean) -> Array Promise a -> Promise Array a
//
//. Takes a predicate and an array of Promise a, returns a Promise of array a
//. which satisfy the predicate.
//
//. ```js
//. > filterp(function(a) { return a > 3; })([
//.     Promise.resolve(2),
//.     Promise.resolve(3),
//.     Promise.resolve(4)])
//. promise
//. [4]
//. ```
exports.filterp = function(fn) {
  return pipe(exports.sequencep, exports.fmapp(filter(fn)));
};

//# foldp :: (b -> a -> Promise b) -> b -> Array a -> Promise b
//
//. Returns a Promise of value b by iterating over an array of value a, successively
//. calling the iterator function and passing it an accumulator value of value b,
//. and the current value from the array, and then waiting until the promise resolved,
//. then passing the result to the next call.
//
//. ```js
//. > foldp(function(b, a) { return Promise.resolve(b + a); })(1)([2, 3, 4])
//. promise
//. 10
//. ```
exports.foldp = function(fn) {
  return function(init) {
    return function(arr) {
      if (!arr.length) {
        return init;
      }

      return fn(init, arr[0]).then(function(b) {
        return exports.foldp(fn)(b)(slice.call(arr, 1));
      });
    };
  };
};
