var Promise = require('bluebird');

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
var getUsersByTokenAndSecret = function(token, secret) {
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

// Token, [User] -> Promise [Photo]
var getPhotosByTokenAndUsers = function(token, users) {
  return Promise.map(users, function(user) {
    return getPhotoByTokenAndUser(token, user);
  });
};

var main = function() {
  return Promise.all([getToken(), getSecret()])
  .spread(function(token, secret) {
    return getUsersByTokenAndSecret(token, secret)
    .then(function(users) {
      return getPhotosByTokenAndUsers(token, users);
    });
  });
};

main()
.then(function(photos) {
  console.log('Photos', photos);
})
.catch(function(error) {
  console.log('Error', error);
});

// Photos [':)', ':D', ':/']
