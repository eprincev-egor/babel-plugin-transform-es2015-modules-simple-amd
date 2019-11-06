# babel-plugin-transform-es2015-modules-amd-fork

Limited transformer for ECMAScript 2015 modules (AMD)

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
  "use strict";
  var _exports = {};
  doSomething();
  _exports.default = x + y;
  return _exports.default;
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

Supported features:
- ``import SPECIFIER from 'PATH'``
- ``import 'PATH'``
- ``import {SPECIFIER1, SPECIFIER2 as SPECIFIER3} from 'PATH'``
- ``export default NODE``
- ``export {item as name}``
- ``export * from 'PATH'``

Other features aren't supported.

**Warning**. If no ``import`` or ``export`` are presented in JavaScript file, the plugin does nothing (means it doesn't wrap code with ``define``).

## Installation

```sh
$ npm install --save-dev babel-plugin-transform-es2015-modules-amd-fork
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["transform-es2015-modules-amd-fork"]
}
```
## More examples
---------------
Converts this code:
```js
import * as x from 'PATH'
```

Into this one:
```js
define(['PATH'], function (x) {
  "use strict";
});
```
---------------

---------------
Converts this code:
```js
import {x, y} from 'PATH'
```

Into this one:
```js
define(['PATH'], function (_PATH) {
  "use strict";
  var x = _PATH.x;
  var y = _PATH.y;
});
```
---------------

---------------
Converts this code:
```js
import "css!style.css"
import js from "js"
```

Into this one:
```js
define(["css!style.css", "js"], function (_cssStyleCss, js) {
  "use strict";
});
```
---------------

---------------
Converts this code:
```js
export function test() {}
```

Into this one:
```js
define([], function () {
  "use strict";
  var _exports = {};
  function test() {}
  _exports.test = test;
  return _exports;
});
```
---------------

---------------
Converts this code:
```js
export default function test() {}
```

Into this one:
```js
define([], function () {
  "use strict";
  var _exports = {};
  _exports.default = function test() {};
  return _exports.default;
});
```
---------------

---------------
Converts this code:
```js
export * from "module"
```

Into this one:
```js
define(["module"], function (_module) {
  "use strict";
  var _exports = {};
  for (var _key in _module) {
    _exports[_key] = _module[key];
  }
  return _exports;
});
```
---------------

[The same thing for CommonJS](https://github.com/finom/babel-plugin-transform-es2015-modules-simple-commonjs).

Thanks to [RReverser](https://github.com/RReverser/babel-plugin-hello-world).  
Thanks to [finom](https://github.com/finom/babel-plugin-transform-es2015-modules-simple-amd).  
Thanks to [dcleao](https://github.com/dcleao/babel-plugin-transform-es2015-modules-simple-amd/tree/8025a44c37e4163a526ad3d3741830ad26ed2708/test/fixtures).
