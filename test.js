'use strict';

var expect = require('chai').expect;
var liftp = require('./index').liftp;
var firstp = require('./index').firstp;
var secondp = require('./index').secondp;
var purep = require('./index').purep;
var fmapp = require('./index').fmapp;
var sequencep = require('./index').sequencep;
var traversep = require('./index').traversep;
var pipep = require('./index').pipep;
var filterp = require('./index').filterp;
var foldp = require('./index').foldp;

var Promise = require('bluebird');

var add = function(a, b) {
  return a + b;
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
    return liftp(add)(Promise.reject(1), Promise.resolve(2))
    .then(function() {
      throw new Error('should fail');
    }, function(r) {
      expect(r).to.equal(1);
    });
  });

  it('fail second', function() {
    return liftp(add)(Promise.resolve(1), Promise.reject(2))
    .then(function() {
      throw new Error('should fail');
    }, function(r) {
      expect(r).to.equal(2);
    });
  });

  it('fail both', function() {
    return liftp(add)(Promise.reject(1), Promise.reject(2))
    .then(function() {
      throw new Error('should fail');
    })
    .catch(function(r) {
      expect(r).to.equal(1);
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
    return firstp(Promise.reject(1), Promise.resolve(2))
    .then(function() {
      throw new Error('should fail');
    })
    .catch(function(r) {
      expect(r).to.equal(1);
    });
  });

  it('fail second', function() {
    return firstp(Promise.resolve(1), Promise.reject(2))
    .then(function() {
      throw new Error('should fail');
    })
    .catch(function(r) {
      expect(r).to.equal(2);
    });
  });

  it('fail both', function() {
    return firstp(Promise.reject(1), Promise.reject(2))
    .then(function() {
      throw new Error('should fail');
    })
    .catch(function(r) {
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
    return secondp(Promise.reject(1), Promise.resolve(2))
    .then(function() {
      throw new Error('should fail');
    })
    .catch(function(r) {
      expect(r).to.equal(1);
    });
  });


  it('fail second', function() {
    return secondp(Promise.resolve(1), Promise.reject(2))
    .then(function() {
      throw new Error('should fail');
    })
    .catch(function(r) {
      expect(r).to.equal(2);
    });
  });


  it('fail both', function() {
    return secondp(Promise.reject(1), Promise.reject(2))
    .then(function() {
      throw new Error('should fail');
    })
    .catch(function(r) {
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
    return liftp(query)(
      secondp(notEmpty('email')(q.email), purep(q.email)),
      secondp(notEmpty('password')(q.password), purep(q.password)))
    .then(function() {
      throw new Error('should fail');
    })
    .catch(function(r) {
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
    return sequencep([Promise.reject(1), Promise.resolve(2)])
    .then(function() {
      throw new Error('should fail');
    }, function(r) {
      expect(r).to.equal(1);
    });
  });

  it('should fail both', function() {
    return sequencep([Promise.reject(1), Promise.reject(2)])
    .then(function() {
      throw new Error('should fail');
    }, function(r) {
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
  it('should resolve', function() {
    var gt = function(a) {
      return function(b) {
        return b > a;
      };
    };
    var p =  filterp(gt(3))([
      Promise.resolve(1),
      Promise.resolve(4),
      Promise.resolve(6),
      Promise.resolve(7)]);
    return p.then(function(arr) {
      expect(arr).to.eql([4,6,7]);
    });
  });
});

describe('foldp', function() {
  it('should resolve', function() {
    return foldp(function(b, a) {
      return Promise.resolve(b + a);
    })(1)([2, 3, 4])
    .then(function(r) {
      expect(r).to.equal(10);
    });
  });
});
