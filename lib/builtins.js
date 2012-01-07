module.exports = {
  js:       [ 'NaN', 'Infinity', 'undefined', 'eval', 'parseInt', 'parseFloat',
              'isNaN', 'isFinite', 'decodeURI', 'decodeURIComponent', 'encodeURI',
              'encodeURIComponent', 'Object', 'Function', 'Array', 'String',
              'Boolean', 'Number', 'Date', 'RegExp', 'Proxy', 'Map', 'Set', 'WeakMap',
              'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError',
              'TypeError', 'URIError', 'Math', 'JSON' ],

  keywords: [ 'break', 'case', 'catch', 'const', 'continue', 'debugger', 'default',
              'delete', 'do', 'else', 'export', 'false', 'finally', 'for', 'function',
              'if', 'import', 'in', 'instanceof', 'let', 'new', 'null', 'return',
              'switch', 'this', 'throw', 'true', 'try', 'typeof', 'undefined', 'var',
              'void', 'while', 'with', 'yield' ],

  node:     [ 'ArrayBuffer', 'Int8Array', 'Uint8Array', 'Int16Array','Uint16Array',
              'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'DataView',
              'process', 'Buffer', 'setInterval', 'clearInterval', 'setTimeout',
              'clearTimeout',  'escape', 'unescape',  'console' ],

  misc:     [ 'global', 'GLOBAL', 'root', '_', '__dirname', '__filename', 'module',
              'require', 'exports' ],

  libs:     [ 'assert', 'buffer', 'child_process', 'cluster', 'crypto','dgram', 'dns',
              'events', 'fs', 'http', 'https', 'net', 'npm', 'os', 'path', 'punycode',
              'querystring', 'readline', 'repl', 'string_decoder', 'tls', 'tty', 'url',
              'util', 'vm', 'zlib' ]
};

module.exports.all = module.exports.js.concat(module.exports.node, module.exports.misc);