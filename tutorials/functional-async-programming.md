Functional Async Programming with Promises
===============================================

I've seen many people struggle with async programming in JavaScript. We all know callback solution doesn't scale. Promises might turn into "Promise hell”. When I was looking for better solutions, I learned functional programming and got inspired. I created the library `bluebird-promisell` to make async programming easy with Promises.

In this tutorial, I’ll provide some real-world examples to illustrate the functional method of async programming with Promises. Hopefully you will learn how this library makes the solution easy to read and scale.

**Start with an async call**
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
is `Promise Photo`; in other words, it’s a Promise that will resolve to a `Photo` type of value.

So if we call `getPhotoByUser` with a user in a `main` function, it's going to print "Photo :)" after 1 second.

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

OK, works. It's a good start. But we’re not done yet: let's see some change from requirement.

**Making async calls in parallel**
----------------------------

Now let's say we have a list of users, and we need to return their photos.

How can we implement a function `getPhotosByUsers` that takes a list of users and returns a Promise of all their photos?

Well, with `bluebird` library, we can implement it with the `getPhotoByUser` we made before:

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

Cool! The `map` function provided by `bluebird` API allows us to make async calls in parallel, and return a Promise which will be resolved when all the photos are fetched.

**Chain async calls**
----------------------------

OK. What if we need to make an async call to get the list of users?

First, let's create a function `delayThenResolve` for making fake async calls. Then we use it to implement `getUsers`.

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

If `getUsers` is provided as above, which takes nothing and return a Promise of users, how can we refactor `getPhotosByUsers` so  it can still return users' photos?

Well, we just need to use the `then` method to chain the async calls, right?

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

OK, it works. What's next?

**Taking inputs from multiple async calls**
--------------------------

Let's say in order to get the list of users, we need an API token and a secret.
And to get them, we have to make separate async calls with the following functions:

```diff
+// () -> Promise Token
+var getToken = function() {
+  return delayThenResolve(1, 'token abc');
+};

+// () -> Promise Secret
+var getSecret = function() {
+  return delayThenResolve(1, 'secret h9irnvxwri');
+};

-// () -> Promise [User]
-var getUsers = function() {
+// (Token, Secret) -> Promise [User]
+var getUsers = function(token, secret) {
  return delayThenResolve(1, ['A', 'B', 'C']);
};
```

We have `getToken` and `getSecret` that will asynchronously return token and secret. And `getUsers` requires two parameters: `token` and `secret`.

We can use the  `Promise.all` function from `bluebird` to refactor the `main` function, like this:

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

It works. But the code is starting to become harder to read.

The next change will make the data flow even more complex.

**Access async data from different function scope**
-------------------------

Now, let's say in order to get photos by user, we need to pass in the API token.

That means we need to pass a new parameter, `token`, to both `getPhotoByUser` and `getPhotosByUsers`.

Let's rename them into `getPhotoByTokenAndUser` and `getPhotosByTokenAndUsers`:

```diff
-// User -> Promise Photo
-var getPhotoByUser = function(user) {
+// (Token, User) -> Promise Photo
+var getPhotoByTokenAndUser = function(token, user) {
  var photo = user === 'A' ? ':)' :
              user === 'B' ? ':D' :
              user === 'C' ? ':/' :
              ':-|';

  return delayThenResolve(1, photo);
};

-// [User] -> Promise [Photo]
-var getPhotosByUsers = function(users) {
-  return Promise.map(users, getPhotoByUser);
+// (Token, [User]) -> Promise [Photo]
+var getPhotosByTokenAndUsers = function(token, users) {
+  return Promise.map(users, function(user) {
+    return getPhotoByTokenAndUser(token, user);
+  });
};
```

How can we  refactor our data flow in `main`?

Well, we can't pass the `token` to `getPhotosByUsers` directly, because they are in different functions' scope.

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

As a workaround, we can move `getPhotosByUsers` to where it can access `token`, and chain `getPhotosByUsers` after `getUsers` so if any errors are raised, they will be caught by the outer catch function.

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

That's it. I will stop adding more changes, as the code has already become complex to read.

Let's summarize the problem so far.

The above data flow is becoming increasingly  nested, and even harder to read.
This is just a simplified real-world example; we can imagine that this nesting will keep growing as later data flow steps require different scopes.

The code readability doesn't scale well in this approach.

How can we simplify it? Is there a best practice to keep the flow straightforward and scalable?


**Straightforward code**
----------------------------

Well, we know the data flow’s async nature is making it complex and nested. Wouldn’t it be straightforward if they were all sync?

All right,  let's assume all the async calls in the above example were sync calls. Then our data flow in `main` would be as simple as this:

```javascript
var main = function() {
  var token = getToken();
  var secret = getSecret();
  var users = getUsers(token, secret);
  var photos = getPhotosByUsers(token, users);
  return photos;
};
```

Flat and neat! Is it possible to organize the async data flow so that it reads as simple as this?

Yes! All we need is a function called `liftp` from the `bluebird-promisell` library, which is a library that provides a set of composable functions for Promises.

**"Lift" your function to make async code flat**
-------------------------------
The function `liftp` can "lift" your function so it can take parameters from Promises:

```diff
+var P = require('bluebird-promisell');

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

Nice! Flat and neat as if it were sync code. More importantly, it reads like sync code!

But for convention and to avoid treating functions as a non-Promise value by mistake, I usually put a `P` at the end to indicate a variable is a Promise, and put their types in the comment.

```diff
var main = function() {
+  // Promise Token
-  var token = getToken();
+  var tokenP = getToken();
+
+  // Promise Secret
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

Cool. Now we know variables with names like `usersP` are Promise values from an async call.

And the function, which is wrapped by `liftp`, will be fed with values from other Promises.

To scan how data flows through these async calls, we can just "unwrap" the `liftp` and the `P` characters in the variable names in our mind –  as if the data flow was synchronous.

If in the future `getPhotosByUsers` needs more data from other sync or async calls, all we need to do is pass the async data through the "lifted” function.

```javascript
  var photosP = P.liftp(getPhotosByUsers)(tokenP, usersP, configP, P.purep(filterSettings));
  //                                                               ^^^^^^^ P.purep is equivalent to Promise.resolve
  //                                                                       which will wrap a value into a Promise
```

That's it. We don't need to change the rest part of our data flow. There’s no need to adjust nesting, because there is no nesting; the code is flat!

You might wonder why we call it `purep`. What's the meaning of `pure`?

This naming style comes from functional programming. I will explain more details at the end of this tutorial, but for now, let's just remember it :)

**Sequential execution**
-----------------------------------------------------------

Since the code is now flat and easy to read, let’s continue adding more requirement changes, see if the code readability holds up.

The function `getPhotosByUsers` is sending async calls in parallel. What if we want to send those async calls sequentially? Meaning, instead
of getting photo for each user simultaneously, getting them one by one?

Before introducing the solution, let's see a similar example: the `reduce` function.

We know how `Array.prototype.reduce` works to reduce an array with an accumulator function and an initial value:

```javascript
var total = [1, 2, 3].reduce(function(sum, value) {
  return sum + value;
}, 0);

console.log(total); // 6
```

We could make a "fold" function that does the same thing – taking the accumulator function, an initial value, and an array – and returning the reduced value:

```javascript
// fold :: (b -> a -> b) -> b -> [a] -> [b]
var fold = function(accumulator, init, array) {
  return array.reduce(accumulator, init);
};
```

We can take the idea of the above "folding" and apply it to make sequential execution of async calls with a function call `foldp` from `bluebird-promisell`.

The type signature of `foldp` is very similar to the `fold` we just created:

```haskell
fold  :: (b -> a -> b)         -> b -> [a] -> [b]
foldp :: (b -> a -> Promise b) -> b -> [a] -> Promise [b]
```

How does `foldp` work? It takes an initial value, and the first item in an array, and applies it to an accumulator function which will return a Promise. It will wait until the Promise gets resolved, then pass the result and the next item in that array to the accumulator function again, and so on. It will "fold" all values in an array sequentially into a single value.

Since all Promises are chained together, if a Promise gets rejected, then the "folding" will halt, and return the rejected error as the fulfilled Promise.

So in order to get photos one by one, we can refactor `getPhotosByUsers` with `foldp`:

```diff
// (Token, [User]) -> Promise [Photo]
var getPhotosByTokenAndUsers = function(token, users) {
  return Promise.map(users, function(user) {
    return getPhotoByTokenAndUser(token, user);
  });
};

+// (Token, [User]) -> Promise [Photo]
+var getPhotosByTokenAndUsersSequentially = function(token, users) {
+  return P.foldp(function(photos, user) {
+    // Promise Photo
+    var photoP = getPhotoByTokenAndUser(token, user);
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

We can also create an `appendTo` function to make the logic easier to read.

```diff
+// [a] -> a -> [a]
+var appendTo = function(array) {
+  return function(item) {
+    return array.concat([item]);
+  };
+};

// (Token, [User]) -> Promise [Photo]
var getPhotosByTokenAndUsersSequentially = function(token, users) {
  return P.foldp(function(photos, user) {
    // Promise Photo
    var photoP = getPhotoByTokenAndUser(token, user);

    // Promise [Photo]
-    var addedP = P.liftp1(function(photo) {
-      return photos.concat([photo]);
-    })(photos);
-    return addedP;
+    return P.liftp1(appendTo(photos))(photoP);
  })([])(users);
};
```

Now if we replace the `getPhotosByTokenAndUsers` function with `getPhotosByTokenAndUsersSequentially` in the `main` function,
It will return photo for each user sequentially.

```diff
var main = function() {
  // Promise Token
  var tokenP = getToken();

  // Promise Secret
  var secretP = getSecret();

  // Promise [User]
  var usersP = P.liftp(getUsers)(tokenP, secretP);

  // Promise [Photo]
-  var photosP = P.liftp(getPhotosByTokenAndUsers)(tokenP, usersP);
+  var photosP = P.liftp(getPhotosByTokenAndUsersSequentially)(tokenP, usersP);

  return photosP;
};

// Photos [':)', ':D', ':/']
```

The above code prints the same log as the parallel version, but since the async calls are sequential, it will take a bit longer.

**Parallel execution**
-----------------------------------
Speaking of the parallel version, `bluebird-promisell` also provides a `traversep` function to make async calls in parallel.

We can refactor the `getPhotosByTokenAndUsers` with `traversep`:

```diff
var getPhotosByTokenAndUsers = function(token, users) {
-  return Promise.map(users, function(user) {
-    return getPhotoByTokenAndUser(token, user);
-  });
+  return P.traversep(function(user) {
+    return getPhotoByTokenAndUser(token, user);
+  })(users);
};
```

There isn’t much different from`bluebird`'s `Promise.map`, only that `traversep` flips the argument’s order. It takes function before the array so it’s easier to compose functions.

How?

Well for instance, at the beginning when `getPhotoByUser` and `getPhotosByUsers` don't have to take "token" as input, we could refactor `getPhotosByUsers` in a
"point-free" style with `traversep`:

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

**Ignoring an async result**
-----------------------------------

Let's look at another change requirement.

Why? Because I want to show you another useful function from `bluebird-promisell` – and it’s a very common case in async programming. :)

Let's say in the last step in our data flow, we'd like to send an email with all the photos, wait until the email has been sent, then resolve the Promise with the photos.

We are provided with `sendEmailWithPhotos` that takes a list of photos and return a Promise that will resolve with nothing after email has been sent.

We will make a fake `sendEmailWithPhotos` by using `delayThenResolve` again:

```diff
+// [Photo] -> Promise void
+var sendEmailWithPhotos = function(photos) {
+  return delayThenResolve(1, null);
+};
```

We could use `liftp` to implement it:

```diff
var main = function() {
  // Promise Token
  var tokenP = getToken();

  // Promise Secret
  var secretP = getSecret();

  // Promise [User]
  var usersP = P.liftp(getUsers)(tokenP, secretP);

  // Promise [Photo]
  var photosP = P.liftp(getPhotosByTokenAndUsersSequentially)(tokenP, usersP);

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

It works, but actually we just need the blocking effect from the Promises `photosP` and `sentP`, and return the `photos` from `photosP`.

Is there a way to let it wait until the two Promises are resolved, then return the value from the first Promise?

Yes, that's exactly `firstp`!

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
  var photosP = P.liftp(getPhotosByTokenAndUsersSequentially)(tokenP, usersP);

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

We just killed another code nesting. The code is still flat and easy to read.

**Summary**
----------------------------------
Alright, I think we've gone through a lot of changes and refactors. This tutorial is quite long. I'm glad you didn't close this page. :)

Let's summarize what we've learned so far.

In this tutorial, we went through a few typical async scenarios. With real-world examples and requirement changes, we saw that as more async calls get involved, the async solution with `bluebird` Promise API will introduce more nesting, making the code harder to read. The code readability does not scale well.

We then refactored with `liftp` to make the async data flow flat. The logic became shorter and much easier to read, and all the Promises were still chained together to catch any error.

Then we also introduced a few patterns to make async calls sequentially or simultaneously, while ignoring certain Promise results using different functions from the `bluebird-promise` library.

All these functions from `bluebird-promisell` are composable, meaning they take functions and return functions to work with Promises. It’s very practical for functional programming.

I hope by now you understand far more about async programming in a functional programming style with Promises.

Here is [the link to the complete code example](https://github.com/zhangchiqing/bluebird-promisell/blob/tutorial/tutorials/functional-async-programming/).

**Want to learn more?**
----------------------------------
There are [more functions](https://github.com/zhangchiqing/bluebird-promisell#api) in the `bluebird-promisell` library that allow us to do filtering, error handling, [validation](https://github.com/zhangchiqing/bluebird-promisell/blob/master/test.js#L203), and more. Please check it out.

**P.S: Function names**
---------------------
I didn't forget about the function names :)

Why do those functions in the library have so many weird names?  `pure`, `lift`, `traverse`? What do they mean?

Well, this library is made for functional programming with Promises. These names are all derived from functional programming.

In functional programming, people make *pure functions*. Pure functions are functions that have no side effects, meaning given the same input, they will always return the same output.

Since async calls are all side effects, in order to make them "pure", there is a pattern called "Monad" which will "wrap" side effects that include async calls.

Promise is "Monad" as well. To be a "Monad", it must implement a few functions. And those functions are called `pure`, `lift`, `traverse`, etc. That's why the library uses similar names.


