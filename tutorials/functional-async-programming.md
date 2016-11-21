Functional Async Programming with Promises
===============================================

I've seen many struggles when people doing async programming in Javascript. We all know callback solution doesn't scale. Promises might turn into "Promise hell". I got inspired when learning functional programming, and made this library called `bluebird-promisell` to make async programming easy with Promises.

In this tutorial, I will give real world example to show the functional way of doing async programming with Promises. Hopefully you will learn how the library makes the solution easy to read and scale.

Start with an async call
----------------

Let's say we have a function called `getPhotoByUser` which takes a user and returns a Promise of the user's photo after 1 second.

```javascript
// User -> Promise Photo
var getPhotoByUser = function(user) {
  var photo = user === 'A' ? ':)' :
              user === 'B' ? ':D' :
              user === 'C' ? ':/' :
              ':-|';

  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve(photo);
    }, 1000);
  });
};
```

The comment `User -> Promise Photo` is the type signature of the function. It means the type of the input is `User`, and the type of the output
is `Promise Photo`, which means it's a Promise that will resolve to a `Photo` type of value.

So if we call `getPhotoByUser` with a user in a `main` function, it's gonna print "Photo :)" after 1 second.

```javascript
var main = function() {
  return getPhotoByUser('A');
};

main()
.then(function(photo) {
  console.log('Photo', photo);
})
.catch(function(error) {
  console.log('Error', error);
});

// Photo :)
```

OK, works. It's a good start. But not done yet, let's see some change from requirement.

Making async calls in parallel
----------------------------

Now let's say we have a list of users, and we need to return their photos.

How to implement a function `getPhotosByUsers` that takes a list of users and return a Promise of all their photos?

Well, with `bluebird` library, we can implement it with the `getPhotoByUser` we've made before:

```diff
+// [User] -> Promise [Photo]
+var getPhotosByUsers = function(users) {
+  return Promise.map(users, getPhotoByUser);
+};

var main = function() {
-  return getPhotoByUser('A');
+  return getPhotosByUsers(['A', 'B', 'C']);
};

-// Photo :)
+// Photos [':)', ':D', ':/']
```

Cool! Nest, `bluebird` provides a map function that allows us to make async calls in parallel and return a Promise
which will be resolved when all the photos are fetched.

Chain async calls
----------------------------

OK. What if we have to make an async call to get the list of users?


```diff
+// Returns a function that will return the given data in a resolved Promise after certain seconds
+var delayThenResolve = function(secs, data) {
+  return new Promise(function(resolve, reject) {
+    setTimeout(function() {
+      resolve(data);
+    }, secs * 1000);
+  });
+};

+// () -> Promise [User]
+var getUsers = function() {
+  return delayThenResolve(1, ['A', 'B', 'C']);
+};

getUsers()
.then(function(users) {
  console.log('Users', users);
});

// ['A', 'B', 'C']
```

If `getUsers` is provded as above, how to refactor `getPhotosByUsers` so that it can still return users' photos?

Well, we just need to use the `then` method, right?

```diff
var main = function() {
-  return getPhotosByUsers(['A', 'B', 'C']);
+  return getUsers()
+  .then(function(users) {
+    return getPhotosByUsers(users);
+  });
};

// Photos [':)', ':D', ':/']
```

OK, It works. What's next?

Taking inputs from multiple async calls
--------------------------

Now let's say in order to get the list users, we need an API token and a secret. And to get them, we have to make separate async calls with the following fuctions.

```diff
+// () -> Promise Token
+var getToken = function() {
+  return delayThenResolve(1, 'token abc');
+};

+// () -> Promise Secret
+var getSecret = function() {
+  return delayThenResolve(1, 'secret h9irnvxwri');
+};

// (Token, Secret) -> Promise [User]
var getUsers = function(token, user) {
  return delayThenResolve(1, ['A', 'B', 'C']);
};
```

So the `getUsers` is now taking `token` and `secret`.

With the `Promise.all` function from `bluebird`, we can refactor the `main` function like this:

```diff
var main = function() {
-  return getUsers()
+  return Promise.all([getToken(), getSecret()])
+  .spread(function(token, secret) {
+    return getUsers(token, secret);
+  })
  .then(function(users) {
    return getPhotosByUsers(users);
  });
};

// Photos [':)', ':D', ':/']
```

It works. But the code starts getting a bit hard to read.

OK, the next change is gonna make the data flow even more complex.

Access async data from differnt function scope
-------------------------

Now, let's say in order to get photo by user, we also need to pass in the api token.
And it also means we need to pass `token` to `getPhotosByUsers`:

```diff
-// User -> Promise Photo
-var getPhotoByUser = function(user) {
+// (Token, User) -> Promise Photo
+var getPhotoByUser = function(token, user) {
  var photo = user === 'A' ? ':)' :
              user === 'B' ? ':D' :
              user === 'C' ? ':/' :
              ':-|';

  return delayThenResolve(1, photo);
};

-// [User] -> Promise [Photo]
-var getPhotosByUsers = function(token, users) {
+// (Token, [User]) -> Promise [Photo]
+var getPhotosByUsers = function(users) {
-  return Promise.map(users, getPhotoByUser);
+  return Promise.map(users, function(user) {
+    return getPhotoByUser(token, user);
+  });
};
```

How to refactor our data flow in `main`?

Well, I can't pass the `token` to `getPhotosByUsers` directly, because they are in different functions' scope.

```diff
var main = function() {
  return Promise.all([getToken(), getSecret()])
  .spread(function(token, secret) {
    return getUsers(token, secret);
  })
  .then(function(users) {
-    return getPhotosByUsers(users);
+    return getPhotosByUsers(token, users);
+    //                      ^^^^^ Error: token is not accessible from here.
  });
};

-// Photos [':)', ':D', ':/']
+// Error: token is undefined
```

To work around it, we will move `getPhotosByUsers` to where it can access `token`, and chain `getPhotosByUsers` after `getUsers` so that
if there is any error raised, it will be caught by the outer catch function:

```diff
var main = function() {
  return Promise.all([getToken(), getSecret()])
  .spread(function(token, secret) {
-    return getUsers(token, secret);
-  })
+    return getUsers(token, secret)
+    .then(function(users) {
+      return getPhotosByUsers(token, users);
+    });
+  });
};

// Photos [':)', ':D', ':/']
```

OK, I will stop adding more changes. Let's summary what's the problem so far.

That problem is that the above data flow is getting more nested, and even harder to read. We can imaging that the nesting will keep growing
as more async data from different scopes are needed in the later flow steps. The code readability doesn't scale well in this approach.

How to simplify it? Is there a good practice to keep the flow straightforward and scale?


Straightforward code
----------------------------

Well, we know it's the async nature which makes the whole data flow nested and complex.
It would be straightforward if they were all sync, isn't it?

Alright, Let's assume all the async calls in the above example are sync calls. Then our data flow in `main` will be as simple as this:

```javascript
var main = function() {
  var token = getToken();
  var secret = getSecret();
  var users = getUsers(token, secret);
  var photos = getPhotosByUsers(token, users);
  return photos;
};
```

Flat and neat! Is it possible to make the async data flow as the above sync data flow?

Yes! All we need is a function `liftp` from `bluebird-promisell` library, which is a library that provides a set of composible functions for Promises.

"Lift" your function to make async code flat
-------------------------------
The function `liftp` can "lift" your function so that it can take parameters from Promises:

```diff
var P = require('bluebird-promisell');

var main = function() {
  var token = getToken();
  var secret = getSecret();
-  var users = getUsers(token, secret);
+  var users = P.liftp(getUsers)(token, secret);
-  var photos = getPhotosByUsers(token, users);
+  var photos = P.liftp(getPhotosByUsers)(token, users);
  return photos;
};

// Photos [':)', ':D', ':/']
```

Nice! Flat and nest as if it was sync code. More importantly it reads like sync code!

But to claim that the data in the flows are all promises, I usually put a `P` in the end of the variable names as convention to indicate the variable is a Promise, so that we don't treat it as a non-Promise value by mistake.

```diff
var main = function() {
+  // Promise Token
-  var token = getToken();
+  var tokenP = getToken();
+
-  // Promise Secret
-  var secret = getSecret();
+  var secretP = getSecret();
+
+  // Promise [User]
-  var users = P.liftp(getUsers)(token, secret);
+  var usersP = P.liftp(getUsers)(tokenP, secretP);
+
+  // Promise [Photo]
-  var photos = P.liftp(getPhotosByUsers)(token, users);
+  var photosP = P.liftp(getPhotosByUsers)(tokenP, usersP);

-  return photos;
+  return photosP;
};

// Photos [':)', ':D', ':/']
```

Cool. Now from the name of the variable, we know it's a Promise value from an async call. And a function is wrapped by
`liftp`, then passed with other Promise values. We can read it and understand the flow by just "unwrap" the `liftp` and
the `P` charactors in the variable names, so the returned Promise value will make sense. Make sense?

If in the future, `getPhotosByUsers` needs more data from other sync or async calls, all we need to do is just passing
it to the "lift"ed function.

```javascript
  var photosP = P.liftp(getPhotosByUsers)(tokenP, usersP, configP, P.purep(filterSettings));
  //                                                               ^^^^^^^ P.purep is equivalent to Promise.resolve
  //                                                                       which will wrap a value into a Promise
```

And with the above changes, we don't need to change the rest part in our data flow, no need to adjust nesting, because there is no nesting.

You might wonder why we call it `purep`, what's the meaning of `pure`?

The naming style is from functional programming, so as the other functions. I will explain more details in the later part of this blog post. But for now, let's just remember it :)

Sequential executing
-----------------------------------------------------------

The function `getPhotosByUsers` is sending async calls in parallel. What if we want to send those async calls sequentially? Meaning, instead
of getting photo for each user simutanislly, getting them just one by one. The reason behind it maybe because we want to slow down.

We know how `Array.reduce` works to reduce an array with an accumulator function and an initial value:

```javascript
var total = [1, 2, 3].reduce(function(sum, value) {
  return sum + value;
}, 0);

console.log(total); // 6
```

We could make a "reduce" function or call it "fold" that takes the accumulator function, an initial value and an array, then returns
the reduced value.

```javascript
// fold :: (b -> a -> b) -> b -> [a] -> [b]
var fold = function(accumulator, init, array) {
  return array.reduce(accumulator, init);
};
```

The `fold` function will take an initial value, and the first item in an array, apply it to an accumulator function, then
pass the result and the next item in that array to the accumulator function again, and so on. It will "fold" all values in an array into a single value.

We can take the idea of the above folding, and apply it to make sequential execution of async calls with a function call `foldp` from `bluebird-promisell`.

The type signatures of `foldp` is very similar to the `fold` we just created:

```haskell
fold  :: (b -> a -> b)         -> b -> [a] -> [b]
foldp :: (b -> a -> Promise b) -> b -> [a] -> Promise [b]
```

So how `foldp` works is that it will take an initial value, and the first item in an array, apply it to an accumulator function, which
will return a Promise. It will wait until the Promise gets resolved, then pass the result and the next item in that array to the accumulator
function again, and so on. It will "fold" all values in an array sequentially into a single value.

If a Promise gets rejected, then the "folding" will just halt, and return the rejected value as the fullfilled Promise.

So in order to get photos one by one, we can refactor `getPhotosByUsers` with `foldp`:

```diff
+// (Token, [User]) -> Promise [Photo]
+var getPhotosByUsersSequentially = function(token, users) {
+  return P.foldp(function(photos, user) {
+    // Promise Photo
+    var photoP = getPhotoByUser(token, user);
+
+    // Promise [Photo]
+    var addedP = P.liftp1(function(photo) {
+      //           ^^^^^^  "liftp1" is equivalent to "liftp" but has better performance when
+      //                   the function to be lifted only takes one parameter.
+      return photos.concat([photo]);
+    })(photos);
+
+    return addedP;
+  })([])(users);
+};
```

We can make an `appendTo` function to the code cleaner.

```diff
+// [a] -> a -> [a]
+var appendTo = function(array) {
+  return function(item) {
+    return array.concat([item]);
+  };
+};

// (Token, [User]) -> Promise [Photo]
var getPhotosByUsersSequentially = function(token, users) {
  return P.foldp(function(photos, user) {
    // Promise Photo
    var photoP = getPhotoByUser(token, user);

    // Promise [Photo]
-    var addedP = P.liftp1(function(photo) {
-      return photos.concat([photo]);
-    })(photos);
-    return addedP;
+    return P.liftp1(appendTo(photos))(photoP);
  })([])(users);
};
```

Now if we replace the `getPhotosByUsers` function with `getPhotosByUsersSequentially` in the `main` function,
it's gonna get photo for each user sequentially.

```diff
var main = function() {
  // Promise Token
  var tokenP = getToken();

  // Promise Secret
  var secretP = getSecret();

  // Promise [User]
  var usersP = P.liftp(getUsers)(tokenP, secretP);

  // Promise [Photo]
-  var photosP = P.liftp(getPhotosByUsers)(tokenP, usersP);
+  var photosP = P.liftp(getPhotosByUsersSequentially)(tokenP, usersP);

  return photosP;
};

// Photos [':)', ':D', ':/']
```

The log result is the same, but it will take longer than the parallel version.

Parallel executing
-----------------------------------
Speaking of the parallel version, `bluebird-promisell` also provides a `traversep` function that iterate over an array, and send async calls in parallel.

We can refactor the `getPhotosByUsers` with `traversep`.

```diff
var getPhotosByUsers = function(token, users) {
-  return Promise.map(users, function(user) {
-    return getPhotoByUser(token, user);
-  });
+  return P.traversep(function(user) {
+    return getPhotoByUser(token, user);
+  })(users);
};
```

No much difference to `bluebird`'s `Promise.map`, but `traversep` flips the arguments order. It takes function first, array the next
so that it's easier to compose functions.

For example, at the beginning when `getPhotoByUser` and `getPhotosByUsers` don't have to take "token" as input, we could refactor `getPhotosByUsers` in a
point-free style with `traversep`:

```diff
// User -> Promise Photo
var getPhotoByUser = function(user) {
  var photo = user === 'A' ? ':)' :
              user === 'B' ? ':D' :
              user === 'C' ? ':/' :
              ':-|';

  return delayThenResolve(1, photo);
};

// [User] -> Promise [Photo]
-var getPhotosByUsers = function(users) {
-  return Promise.map(users, getPhotoByUser);
-};
+var getPhotosByUsers = P.traversep(getPhotoByUser);
```

Igorning an async result
-----------------------------------

OK, let's see another change requirement here.

Why? because I want to show you another very useful function from `bluebird-promisell` and it's use case :)

Let's say in the last step in our data flow, we'd like to send an email with all the photos, and wait until the email
has been sent, then resolve the Promise with the photos.

We are provided with a `sendEmailWithPhotos` that takes a list of photo and return a Promise that will resolve with nothing.

Alright, we could use `liftp` to implement it:

```diff
+// [Photo] -> Promise void
+var sendEmailWithPhotos = function(photos) {
+  return delayThenResolve(1, null);
+};

var main = function() {
  // Promise Token
  var tokenP = getToken();

  // Promise Secret
  var secretP = getSecret();

  // Promise [User]
  var usersP = P.liftp(getUsers)(tokenP, secretP);

  // Promise [Photo]
  var photosP = P.liftp(getPhotosByUsersSequentially)(tokenP, usersP);

-  return photosP;
+  // Promise void
+  var sentP = P.liftp1(sendEmailWithPhotos)(photosP);
+
+  // Promise [Photo]
+  var resultP = P.liftp(function(photos, sent) {
+    return photos;
+  })(photosP, sentP);
+
+  return resultP;
};

// Photos [':)', ':D', ':/']
```

It works, but actually we just need the effect of the both Promises, and the result value from the first Promise.

Is there a way to say wait until the two Promises are resolved, and return the value from the first Promise?

Yes, that's `firstp`!

```diff
// [Photo] -> Promise void
var sendEmailWithPhotos = function(photos) {
  return delayThenResolve(1, null);
};

var main = function() {
  // Promise Token
  var tokenP = getToken();

  // Promise Secret
  var secretP = getSecret();

  // Promise [User]
  var usersP = P.liftp(getUsers)(tokenP, secretP);

  // Promise [Photo]
  var photosP = P.liftp(getPhotosByUsersSequentially)(tokenP, usersP);

  // Promise void
  var sentP = P.liftp1(sendEmailWithPhotos)(photosP);

  // Promise [Photo]
-  var resultP = P.liftp(function(photos, sent) {
-    return photos;
-  })(photosP, sentP);
+  var resultP = P.firstp(photosP, sentP);

  return resultP;
};

// Photos [':)', ':D', ':/']
```

Summary
----------------------------------
Alright, I think we've gone through a lot of changes and refactors. The blog post is quite long. I'm glad you didn't close the page :). Let's summary what we've learned so far.

In this blog post, we went through a few typicall async scenarios. With real world examples, we can see that as more async calls gets involved, the async solution with blurbird Promise API will introduce more nesting and the code will be hard to read. It doesn't scale well.

We then refactored with `liftp` to make the async data flow flat, easier to read and still have all the promises chained together.

Going forward, we also introduced a few patterns to make async calls sequentially or simutanislly, as well as ignoring certain Promise result using different functions from the `blurbird-promise` library.

All these functions are composible, meaning they take functions and return functions to work with Promises. Very practical for functional programming.

I hope by now you should understand far more of async programming in a "sync" style in Javascript.

Want to learn more?
----------------------------------
There are more functions in the `bluebird-promisell` library that allows us to do filtering, error handling and more. Please check it out.

PS: Function names
---------------------
Yes, I didn't forget about the function names :)

Why those functions in the library have so many weired name? What do `pure`, `lift`, `traverse` etc?

Well, this library is made for functional programming with Promises. These names are all from functional programming.

In functional programming, we make pure functions. Pure functions are functions that has no side effect, meaning given the same input, it will always return the same output.

Since async calls are all side effects, there is a pattern called "Monad" in functional programming to "wrap" side effects that includes async calls.

Promise is Monad as well. To be a "Monad", it must implement a few functions. And those functions are called `pure`, `lift`, `traverse` etc. That's why the library uses the similar names.
