'use strict';

var createError = require('errno').create;

var AxecoreNodeError = createError('AxecoreNodeError');

var RPCError = createError('RPCError', AxecoreNodeError);

module.exports = {
  Error: AxecoreNodeError,
  RPCError: RPCError
};
