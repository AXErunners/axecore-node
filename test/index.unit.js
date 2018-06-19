'use strict';

var should = require('chai').should();

describe('Index Exports', function() {
  it('will export axecore-lib', function() {
    var axecore = require('../');
    should.exist(axecore.lib);
    should.exist(axecore.lib.Transaction);
    should.exist(axecore.lib.Block);
  });
});
