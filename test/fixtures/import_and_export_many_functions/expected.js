define(["lodash", "helpers"], function (_lodash, helpers) {
  "use strict";
  var isString = _lodash.isString;
  var isFunction = _lodash.isFunction;
  var _exports = {};
  function helper1() {
    return isString();
  }
  function helper2() {
    return isFunction();
  }
  function helper3() {
    return helpers.help();
  }
  _exports.helper1 = helper1;
  _exports.helper2 = helper2;
  _exports.helper3 = helper3;
  return _exports;
});
