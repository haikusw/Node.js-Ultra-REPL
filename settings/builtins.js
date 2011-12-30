
module.exports = {
  js:   [ 'NaN', 'Infinity', 'undefined',
          'eval', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'decodeURI',
          'decodeURIComponent', 'encodeURI', 'encodeURIComponent',
          'Object', 'Function', 'Array', 'String', 'Boolean', 'Number',
          'Date', 'RegExp', 'Proxy', 'Map', 'Set', 'WeakMap',
          'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError',
          'TypeError', 'URIError', 'Math', 'JSON' ],

  node: [ 'console', 'process', 'Buffer', 'escape', 'unescape',
          'setTimeout', 'clearTimeout',  'setInterval', 'clearInterval',
          'ArrayBuffer', 'DataView', 'Float32Array', 'Float64Array', 'Int8Array',
          'Uint8Array', 'Int16Array','Uint16Array', 'Int32Array', 'Uint32Array' ],

  misc: [ 'global', 'GLOBAL', 'root', '_', '__dirname', '__filename',
          'module', 'require', 'exports' ],


  libs: [ 'assert', 'buffer', 'child_process', 'cluster', 'crypto','dgram', 'dns',
          'events', 'fs', 'http', 'https', 'net', 'npm', 'os', 'path', 'punycode',
          'querystring', 'readline', 'repl', 'string_decoder', 'tls', 'tty', 'url',
          'util', 'vm', 'zlib' ]
};

module.exports.all = module.exports.js.concat(module.exports.node, module.exports.misc);