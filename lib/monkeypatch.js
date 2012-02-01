var vm = require('vm');


var re1 = /^(?:\x1b)([a-zA-Z0-9])$/;
var re2 = /^(?:\x1b+)(O|N|\[|\[\[)(?:(\d+)(?:;(\d+))?([~^$])|(?:1;)?(\d+)?([a-zA-Z]))/;

/* fix some missing keys in Node's tty until it's fixed upstream
   https://github.com/Benvie/node/commit/95a7681a4f16609291b26de073e5343f9a3f4287 */
module.exports.fixEmitKey = (function fixEmitKey(ttyStream){
  var ttyStreamProto = Object.getPrototypeOf(ttyStream);
  if (!ttyStreamProto._emitKey) return;
  var sourcecode = ttyStreamProto._emitKey.toString();

  if (~sourcecode.indexOf('[[A')) return;

  sourcecode = sourcecode.split('\n').slice(1);

  sourcecode.unshift('(function(){',
                     'var metaKeyCodeRe = ' + re1,
                     'var functionKeyCodeRe = ' + re2,
                     'return function fixedEmitKey(s){');

  sourcecode.push('})()');

  for (var spliceAt = sourcecode.length; --spliceAt >= 0;) {
    if (sourcecode[spliceAt].trim() === 'switch (code) {') {
      spliceAt++;
      break;
    }
  }
  if (!~spliceAt) return;

  sourcecode.splice(spliceAt, 0, [
    ['[[A', 'f1'],
    ['[[B', 'f2'],
    ['[[C', 'f3'],
    ['[[D', 'f4'],
    ['[[E', 'f5']
  ].map(function(map){
    return "case '"+map[0]+"': key.name = '"+map[1]+"'; break;";
  }).join('\n'));

  ttyStreamProto._emitKey = vm.runInThisContext(sourcecode.join('\n'));
})(process.stdin);

module.exports.typedArrays = (function typedArrays(target){
  if (!('ArrayBuffer' in target) && parseFloat(process.version.slice(1)) >= .7) {
    try { var binding = process.binding('typed_array') } catch (e) { return }
    for (var k in binding) {
      Object.defineProperty(target, k, { value: binding[k], writable: true, configurable: true });
    }
  }
})(global);