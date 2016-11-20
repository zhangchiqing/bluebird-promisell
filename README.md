# bluebird-promisell
A functional programming library for promises.

`bluebird-promisell` provides a set of composable functions that allows you to write flat async code with promises.

## Usage
### Write flat async code with "liftp"

Let's say we have the following sync code to get a list of userId.

```javascript
var getToken = function() { return 'token'; };
var getSecret = function() { return 'secret'; };
var getUserIds = function(token, secret) {
  return [1, 2, 3];
};

// Token
var token = getToken();

// Secret
var secret = getSecret();

// [UserId]
var userIds = getUserIds(token, secret);

console.log(userIds); // [1, 2, 3]
```

Now, if the sub functions `getToken`, `getSecret`, `getUserIds` becomes async (all return Promise),
the only change we need to make is "lifting" `getUserIds` with `liftp`.

```javascript
var Promise = require('bluebird');
var P = require('bluebird-promisell');

var getToken = function() { return Promise.resolve('token'); };
var getSecret = function() { return Promise.resolve('secret'); };
var getUserIds = function(token, secret) {
  return Promise.resolve([1, 2, 3]);
};

// Promise Token
var tokenP = getToken();

// Promise Secret
var secretP = getSecret();

// Promise [UserId]
var userIdsP = P.liftp(getUserIds)(tokenP, secretP);

userIdsP.then(console.log); // [1, 2, 3]
```

Now the code runs async, but it reads like sync code.

### Making async calls in parallel with "traversep"

```javascript
var getPhotoByUserId = function(userId) {
  if (userId === 1) {
    return ':)';
  } else if (userId === 2) {
    return ':D';
  } else {
    return ':-|';
  }
};

// Promise Token
var tokenP = getToken();

// Promise Secret
var secretP = getSecret();

// Promise [UserId]
var userIdsP = P.liftp(getUserIds)(tokenP, secretP);

// Promise [Photo]
var photosP = P.traversep(getPhotoByUserId)(userIdsP);
photosP.then(console.log); // [":)", ":D", ":-|"]
```

### Making async calls sequentially with "foldp"
```javascript
// Promise [UserId]
var userIdsP = P.liftp(getUserIds)(tokenP, secretP);

// [Photo] -> Photo -> [Photo]
var appendPhotos = function(photos, photo) {
  return photos.concat([photo]);
};

// Promise [Photo]
var photosP = P.foldp(function(photos, userId) {
  // Promise Photo
  var photoP = getPhotoByUserId(userId);
  return P.liftp(appendPhotos)(P.purep(photos), photoP); // `P.purep` is equivalent to `Promise.resolve`
})([])(userIdsP);

photosP.then(console.log); // [":)", ":D", ":-|"]
```

The above code will fetch photo by userId sequentially. If it fails to fetch the first photo,
it will reject the promise without fetching next photo.
And it will resolve the promise once all the photos have been fetched.

## Wait until the second async call to finish, then return the value of the first async call

Let's say we want to send an email with all the photos, and wait until the email has been sent,
then resolve the promise with the photos

With `firstp`, we can wait until the email has been sent, and return the result of photos which
is from the first promise.

```javascript
var sendEmailWithPhotos = function(photos) {
  return Promise.resolve('The email has been sent');
};

// Promise [Photo]
var photosP = P.foldp(function(photos, userId) {
  // Promise Photo
  var photoP = getPhotoByUserId(userId);
  return P.liftp(appendPhotos)(P.purep(photos), photoP); // `P.purep` is equivalent to `Promise.resolve`
})([])(userIdsP);

// Promise String
var sentP = P.liftp1(sendEmailWithPhotos)(photosP);
//          ^^^^^^^^ P.liftp1 is equivalent to P.liftp when there is only one promise to resolve.
//                   But P.liftp1 has better performance than P.liftp.

P.first(photosP, sentP).then(console.log); // [":)", ":D", ":-|"]
```

## API
<h3 name="purep"><code><a href="./index.js#L139">purep :: a -> Promise a</a></code></h3>

Takes any value, returns a resolved Promise with that value

```js
> purep(3).then(console.log)
promise
3
```

<h3 name="fmapp"><code><a href="./index.js#L200">fmapp :: (a -> b) -> Promise a -> Promise b</a></code></h3>

Transforms a Promise of value a into a Promise of value b

```js
> fmapp(function(a) { return a + 3; }, Promise.resolve(4)).then(console.log)
promise
7
```

<h3 name="sequencep"><code><a href="./index.js#L216">sequencep :: Array Promise a -> Promise Array a</a></code></h3>

Transforms an array of Promise of value a into a Promise of array of a.

```js
> sequencep([Promise.resolve(3), Promise.resolve(4)]).then(console.log)
promise
[3, 4]
```

<h3 name="traversep"><code><a href="./index.js#L229">traversep :: (a -> Promise b) -> Array a -> Promise Array b</a></code></h3>

Maps a function that takes a value a and returns a Promise of value b over an array of value a,
then use `sequencep` to transform the array of Promise b into a Promise of array b

```js
> traversep(function(a) { return Promise.resolve(a + 3); })(
    [2, 3, 4])
promise
[5, 6, 7]
```

<h3 name="pipep"><code><a href="./index.js#L244">pipep :: [(a -> Promise b), (b -> Promise c), ... (m -> Promise n)] -> a -> Promise n</a></code></h3>

Performs left-to-right composition of an array of Promise-returning functions.

```js
> pipep([
    function(a) { return Promise.resolve(a + 3); },
    function(b) { return Promise.resolve(b * 10); },
  ])(6);
promise
90
```

<h3 name="liftp"><code><a href="./index.js#L264">liftp :: (a -> b -> ... n -> x) -> Promise a -> Promise b -> ... -> Promise n -> Promise x</a></code></h3>

Takes a function so that this function is able to read input values from resolved Promises,
and return a Promise that will resolve with the output value of that function.

```js
> liftp(function(a, b, c) { return (a + b) * c; })(
    Promise.resolve(3),
    Promise.resolve(4),
    Promise.resolve(5));
promise
35
```

<h3 name="liftp1"><code><a href="./index.js#L283">liftp1 :: (a -> b) -> Promise a -> Promise b</a></code></h3>

Takes a function and apply this function to the resolved Promise value, and return
a Promise that will resolve with the output of that function.

```js
> liftp1(function(user) {
    return user.email;
  })(Promise.resolve({ email: 'abc@example.com' }));
promise
abc@example.com
```

<h3 name="firstp"><code><a href="./index.js#L299">firstp :: Promise a -> Promise b -> Promise a</a></code></h3>

Takes two Promises and return the first if both of them are resolved

```js
> firstp(Promise.resolve(1), Promise.resolve(2))
promise
1

> firstp(Promise.resolve(1), Promise.reject(new Error(3)))
promise
Error 3
```

<h3 name="secondp"><code><a href="./index.js#L316">secondp :: Promise a -> Promise b -> Promise b</a></code></h3>

Takes two Promises and return the second if both of them are resolved

```js
> secondp(Promise.resolve(1), Promise.resolve(2))
promise
2

> secondp(Promise.resolve(1), Promise.reject(new Error(3)))
promise
Error 3
```

<h3 name="filterp"><code><a href="./index.js#L331">filterp :: (a -> Promise Boolean) -> Array a -> Promise Array a</a></code></h3>

Takes a predicat that returns a Promise and an array of a, returns a Promise of array a
which satisfy the predicate.

```js
> filterp(function(a) { return Promise.resolve(a > 3); })([2, 3, 4])
promise
[4]
```

<h3 name="foldp"><code><a href="./index.js#L347">foldp :: (b -> a -> Promise b) -> b -> Array a -> Promise b</a></code></h3>

Returns a Promise of value b by iterating over an array of value a, successively
calling the iterator function and passing it an accumulator value of value b,
and the current value from the array, and then waiting until the promise resolved,
then passing the result to the next call.

foldp resolves promises sequentially

```js
> foldp(function(b, a) { return Promise.resolve(b + a); })(1)([2, 3, 4])
promise
10
```

<h3 name="mapError"><code><a href="./index.js#L375">mapError :: (Error -> Error) -> Promise a -> Promise a</a></code></h3>

Transform the rejected Error.

```js
> mapError(function(err) {
    var newError = new Error(err.message);
    newError.status = 400;
    return newError;
  })(Promise.reject(new Error('Not Found')));
rejected promise
```

<h3 name="resolveError"><code><a href="./index.js#L396">resolveError :: (Error -> b) -> Promise a -> Promise b</a></code></h3>

Recover from a rejected Promise

```js
> resolveError(function(err) {
    return false;
  });
```
promise
false

<h3 name="toPromise"><code><a href="./index.js#L413">toPromise :: (a -> Boolean) -> (a -> Error) -> a -> Promise a</a></code></h3>

Takes a `predict` function and a `toError` function, return a curried
function that can take a value and return a Promise.
If this value passes the predict, then return a resolved Promise with
that value, otherwise pass the value to the `toError` function, and
return a rejected Promise with the output of the `toError` function.

```js
var validateGreaterThan0 = toPromise(function(a) {
  return a > 0;
}, function(a) {
  return new Error('value is not greater than 0');
});

> validateGreaterThan0(10)
promise
10

> validateGreaterThan0(-10)
rejected promise
Error 'value is not greater than 0'
```
