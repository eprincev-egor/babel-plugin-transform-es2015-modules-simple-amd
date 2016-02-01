# babel-plugin-transform-es2015-modules-simple-amd

Limited AMD transformer for ECMAScript 2015 modules.

Converts this code:
```js
import x from '/path/to/x';
import y from '/path/to/y';
doSomething();
export default x + y;
```

Into this one:
```js
define(['/path/to/x', '/path/to/y'], function (x, y) {
  doSomething();
  return x + y;
});
```

Instead of this one (generated with ``babel-plugin-transform-es2015-modules-amd``):
```js
define(['exports', '/path/to/x', '/path/to/y'], function (exports, _x, _y) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _x2 = _interopRequireDefault(_x);

  var _y2 = _interopRequireDefault(_y);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      'default': obj
    };
  }

  doSomething();
  exports.default = _x2.default + _y2.default;
});
```

Other features (like ``import x as y from 'X'`` or ``import * from 'X'`` etc) aren't supported. Just ``import VARIABLE from 'PATH'``.

**Warning**. Code after ``export default`` will be ignored because it's simply replaced by ``return``.

```js
doSomething();
export default x + y;
thisCodeWillNotBeCalled();
```

## Installation

```sh
$ npm install --save-dev babel-plugin-transform-es2015-modules-simple-amd
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["transform-es2015-modules-simple-amd"]
}
```

### Via Node API

```javascript
require('babel').transform('code', {
  plugins: ['transform-es2015-modules-simple-amd']
});
```


Thanks to [RReverser](https://github.com/RReverser/babel-plugin-hello-world).