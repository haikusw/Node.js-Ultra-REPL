var vm = require('vm');


/* fix some missing keys in Node's tty until it's fixed upstream
   https://github.com/Benvie/node/commit/95a7681a4f16609291b26de073e5343f9a3f4287 */
module.exports = function fixEmitKey(ttyStream){
  var ttyStreamProto = Object.getPrototypeOf(ttyStream);
  if (ttyStreamProto._emitKey.name === 'fixedEmitKey') return;

  var re1 = /^(?:\x1b)([a-zA-Z0-9])$/;
  var re2 = /^(?:\x1b+)(O|N|\[|\[\[)(?:(\d+)(?:;(\d+))?([~^$])|(?:1;)?(\d+)?([a-zA-Z]))/;

  var sourcecode = ttyStreamProto._emitKey.toString().split('\n').slice(1);
  sourcecode.unshift(
    '(function(){',
    'var metaKeyCodeRe = ' + re1,
    'var functionKeyCodeRe = ' + re2,
    'return function fixedEmitKey(s){'
  );
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
}