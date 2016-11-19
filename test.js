'use strict';

var expect = require('chai').expect;
var liftp = require('./index').liftp;
var liftp1 = require('./index').liftp1;
var liftp2 = require('./index').liftp2;
var liftp3 = require('./index').liftp3;
var liftp4 = require('./index').liftp4;
var liftp5 = require('./index').liftp5;
var firstp = require('./index').firstp;
var secondp = require('./index').secondp;
var purep = require('./index').purep;
var fmapp = require('./index').fmapp;
var sequencep = require('./index').sequencep;
var traversep = require('./index').traversep;
var pipep = require('./index').pipep;
var filterp = require('./index').filterp;
var foldp = require('./index').foldp;
var mapError = require('./index').mapError;
var resolveError = require('./index').resolveError;
var toPromise = require('./index').toPromise;

var Promise = require('bluebird');

var add = function(a, b) {
  return a + b;
};

var promiseShouldFail = function(promise) {
  return new Promise(function(resolve, reject) {
    promise.then(reject).catch(resolve);
  });
};

describe('purep', function() {
  it('should resolve', function() {
    return purep(3).then(function(r) {
      expect(r).to.equal(3);
    });
  });
});

describe('liftp', function() {
  it('should resolve', function() {
    return liftp(add)(Promise.resolve(1), Promise.resolve(2))
    .then(function(r) {
      expect(r).to.equal(3);
    });
  });

  it('fail first', function() {
    return promiseShouldFail(liftp(add)(Promise.reject(1), Promise.resolve(2)))
    .then(function(r) {
      expect(r).to.equal(1);
    });
  });

  it('fail second', function() {
    return promiseShouldFail(liftp(add)(Promise.resolve(1), Promise.reject(2)))
    .then(function(r) {
      expect(r).to.equal(2);
    });
  });

  it('fail both', function() {
    return promiseShouldFail(liftp(add)(Promise.reject(1), Promise.reject(2)))
    .then(function(r) {
      expect(r).to.equal(1);
    });
  });

});

describe('liftp1', function() {
  it('resolve', function() {
    return liftp1(function(user) {
      return user.email;
    })(Promise.resolve({ email: 'abc@example.com' }));
  });
});

describe('liftp1', function() {
  it('resolve', function() {
    return liftp2(function(a, b) {
      return a + b;
    })(Promise.resolve(2), Promise.resolve(3))
    .then(function(r) {
      expect(r).to.equal(5);
    });
  });
});


describe('liftp1', function() {
  it('resolve', function() {
    return liftp2(function(a, b) {
      return a + b;
    })(Promise.resolve(2), Promise.resolve(3))
    .then(function(r) {
      expect(r).to.equal(5);
    });
  });
});

describe('liftp3', function() {
  it('resolve', function() {
    return liftp3(function(a, b, c) {
      return a + b + c;
    })(Promise.resolve(2), Promise.resolve(3), Promise.resolve(4))
    .then(function(r) {
      expect(r).to.equal(9);
    });
  });
});



describe('liftp4', function() {
  it('resolve', function() {
    return liftp4(function(a, b, c, d) {
      return a + b + c + d;
    })(Promise.resolve(2), Promise.resolve(3), Promise.resolve(4), Promise.resolve(5))
    .then(function(r) {
      expect(r).to.equal(14);
    });
  });
});


describe('liftp5', function() {
  it('resolve', function() {
    return liftp5(function(a, b, c, d, e) {
      return a + b + c + d + e;
    })(Promise.resolve(2), Promise.resolve(3), Promise.resolve(4), Promise.resolve(5), Promise.resolve(6))
    .then(function(r) {
      expect(r).to.equal(20);
    });
  });
});

describe('firstp', function() {
  it('resolve', function() {
    return firstp(Promise.resolve(1), Promise.resolve(2))
    .then(function(r) {
      expect(r).to.equal(1);
    });
  });

  it('fail first', function() {
    return promiseShouldFail(firstp(Promise.reject(1), Promise.resolve(2)))
    .then(function(r) {
      expect(r).to.equal(1);
    });
  });

  it('fail second', function() {
    return promiseShouldFail(firstp(Promise.resolve(1), Promise.reject(2)))
    .then(function(r) {
      expect(r).to.equal(2);
    });
  });

  it('fail both', function() {
    return promiseShouldFail(firstp(Promise.reject(1), Promise.reject(2)))
    .then(function(r) {
      expect(r).to.equal(1);
    });
  });
});

describe('secondp', function() {
  it('resolve', function() {
    return secondp(Promise.resolve(1), Promise.resolve(2))
    .then(function(r) {
      expect(r).to.equal(2);
    });
  });

  it('fail first', function() {
    return promiseShouldFail(secondp(Promise.reject(1), Promise.resolve(2)))
    .then(function(r) {
      expect(r).to.equal(1);
    });
  });


  it('fail second', function() {
    return promiseShouldFail(secondp(Promise.resolve(1), Promise.reject(2)))
    .then(function(r) {
      expect(r).to.equal(2);
    });
  });


  it('fail both', function() {
    return promiseShouldFail(secondp(Promise.reject(1), Promise.reject(2)))
    .then(function(r) {
      expect(r).to.equal(1);
    });
  });
});

describe('validation', function() {
  var query = function(email, password) {
    return { email: email, password: password };
  };

  var notEmpty = function(field) {
    return function(a) {
      if (!a) {
        return Promise.reject('Field ' + field + ' cannot be empty');
      } else {
        return Promise.resolve(a);
      }
    };
  };

  it('should resolve', function() {
    var q = { email: 'a@b.c', password: 'ppp' };
    return liftp(query)(
      secondp(notEmpty('email')(q.email), purep(q.email)),
      secondp(notEmpty('password')(q.password), purep(q.password)))
    .then(function(validQ) {
      expect(validQ).to.eql(q);
    });
  });

  it('should fail if mising field', function() {
    var q = { email: 'a@b.c', password: undefined };
    return promiseShouldFail(liftp(query)(
      secondp(notEmpty('email')(q.email), purep(q.email)),
      secondp(notEmpty('password')(q.password), purep(q.password))))
    .then(function(r) {
      expect(r).to.equal('Field password cannot be empty');
    });
  });
});

describe('fmapp', function() {
  it('should resolve', function() {
    return fmapp(function(x) { return x * 3; })(Promise.resolve(1))
    .then(function(r) {
      expect(r).to.equal(3);
    });
  });
});

describe('sequencep', function() {
  it('should resolve', function() {
    return sequencep([Promise.resolve(1), Promise.resolve(2)])
    .then(function(r) {
      expect(r).to.eql([1, 2]);
    });
  });

  it('should fail one', function() {
    return promiseShouldFail(sequencep([Promise.reject(1), Promise.resolve(2)]))
    .then(function(r) {
      expect(r).to.equal(1);
    });
  });

  it('should fail both', function() {
    return promiseShouldFail(sequencep([Promise.reject(1), Promise.reject(2)]))
    .then(function(r) {
      expect(r).to.equal(1);
    });
  });
});

var resolveLater = function(a) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve(a * 3);
    }, 10);
  });
};

describe('traversep', function() {
  it('should resolve', function() {
    return traversep(resolveLater)([1, 2, 3])
    .then(function(r) {
      expect(r).to.eql([3, 6, 9]);
    });
  });
});

describe('pipep', function() {
  it('should resolve', function() {
    return pipep([resolveLater, resolveLater])(1)
    .then(function(r) {
      expect(r).to.equal(9);
    });
  });
});

describe('filterp', function() {
  var gt = function(a) {
    return function(b) {
      return Promise.resolve(b > a);
    };
  };

  it('should resolve', function() {
    var p =  filterp(gt(3))([1,4,6,7]);
    return p.then(function(arr) {
      expect(arr).to.eql([4,6,7]);
    });
  });

  it('should resolve for empty array', function() {
    var p =  filterp(gt(3))([]);
    return p.then(function(arr) {
      expect(arr).to.eql([]);
    });
  });
});

describe('foldp', function() {
  var sum = function(b, a) {
    return Promise.resolve(b + a);
  };

  it('should resolve', function() {
    return foldp(sum)(1)([2, 3, 4])
    .then(function(r) {
      expect(r).to.equal(10);
    });
  });

  it('should resolve when array is empty', function() {
    return foldp(sum)(1)([])
    .then(function(r) {
      expect(r).to.equal(1);
    });
  });
});

describe('mapError', function() {
  it('should fail with transformed error', function() {
    var transformer = function(error) {
      var newError = new Error('new Error');
      newError.status = 400;
      return newError;
    };

    var shouldFail = mapError(transformer)(Promise.reject(new Error('error')));
    return promiseShouldFail(shouldFail).then(function(error) {
      expect(error.status).to.equal(400);
      expect(error.message).to.equal('new Error');
    });
  });
});

describe('resolveError', function() {
  it('should resolve', function() {
    var recoverFn = function(error) {
      return 'resolved';
    };

    return resolveError(recoverFn)(Promise.reject(new Error('error')))
    .then(function(r) {
      expect(r).to.equal('resolved');
    });
  });
});

describe('toPromise', function() {
  var validateGreaterThan0 = toPromise(function(a) {
    return a > 0;
  }, function(a) {
    return new Error('value is not greater than 0');
  });

  it('should resolve', function() {
    return validateGreaterThan0(10)
    .then(function(r) {
      expect(r).to.equal(10);
    });
  });

  it('should fail', function() {
    return promiseShouldFail(validateGreaterThan0(-10))
    .then(function(error) {
      expect(error.message).to.equal('value is not greater than 0');
    });
  });
});

// (a, a) -> Bool
var equal = function(a1, a2) {
  expect(a1).to.equal(a2);
};

// (Promise a, Promise a) -> Promise Bool
var promiseEq = liftp2(equal);

// a -> a
var identity = function(a) {
  return a;
};

describe('Functor laws', function() {
  it('identity law', function() {
    var p = purep(3);
    return promiseEq(
      fmapp(identity)(p),
      p);
  });

  it('composition law', function() {
    var p = purep(3);
    var add2 = function(a) {
      return a + 2;
    };

    var mul3 = function(b) {
      return b * 3;
    };

    return promiseEq(
      fmapp(function(x) { return add2(mul3(x)); })(p),
      fmapp(add2)(fmapp(mul3)(p)));
  });
});

describe('Applicative laws', function() {
  it('identity law', function() {
    var p = purep(3);
    return promiseEq(liftp(identity)(p), p);
  });

  it('homomorphism law', function() {
    var p = purep(3);
    var add2 = function(a) {
      return a + 2;
    };
    return promiseEq(liftp(add2)(p), purep(add2(3)));
  });
});
