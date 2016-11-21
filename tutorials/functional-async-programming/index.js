var P = require('../../index.js');

// Number, a -> Promise a
var delayThenResolve = function(secs, data) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve(data);
    }, secs * 1000);
  });
};

// () -> Promise Token
var getToken = function() {
  return delayThenResolve(1, 'token abc');
};

// () -> Promise Secret
var getSecret = function() {
  return delayThenResolve(1, 'secret h9irnvxwri');
};

// Token, Secret -> Promise [User]
var getUsers = function(token, secret) {
  return delayThenResolve(1, ['A', 'B', 'C']);
};

// Token, User -> Promise String
var getPhotoByTokenAndUser = function(token, user) {
  var photo = user === 'A' ? ':)' :
              user === 'B' ? ':D' :
              user === 'C' ? ':/' :
              ':-|';
  return delayThenResolve(1, photo);
};

// [Photo] -> Promise void
var sendEmailWithPhotos = function(photos) {
  return delayThenResolve(1, null);
};

// Token, [User] -> Promise [Photo]
var getPhotosByTokenAndUsers = function(token, users) {
  return P.traversep(function(user) {
    return getPhotoByTokenAndUser(token, user);
  })(users);
};

// [a] -> a -> [a]
var appendTo = function(array) {
  return function(item) {
    return array.concat([item]);
  };
};

// (Token, [User]) -> Promise [Photo]
var getPhotosByTokenAndUsersSequentially = function(token, users) {
  return P.foldp(function(photos, user) {
    // Promise Photo
    var photoP = getPhotoByTokenAndUser(token, user);

    // Promise [Photo]
    return P.liftp1(appendTo(photos))(photoP);
  })([])(users);
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
  var resultP = P.firstp(photosP, sentP);

  return resultP;
};

main()
.then(function(photo) {
  console.log('Photo', photo);
})
.catch(function(error) {
  console.log('Error', error);
});

// Photos [':)', ':D', ':/']
