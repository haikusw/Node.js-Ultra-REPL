var vm = require('vm');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var exists = fs.existsSync || path.existsSync;



module.exports = Script;

function Script(code, name){
  if (!~code.indexOf('\n') && path.extname(code) === '.js') {
    var file = resolve(code);
    if (!file) throw new Error('File not found: ' + file);
    if (file in Script.fileCache) return Script.fileCache[file];
    Script.fileCache[file] = this;
    name = name || path.basename(file);
    code = fs.readFileSync(file);
  }

  var hash = sha(code);
  if (hash in Script.cache) return Script.cache[hash];
  Script.cache[hash] = this;

  var wrap = Script.compile(code, name);

  Object.defineProperties(this, {
    name: { value: name || '', enumerable: true },
    code: { value: code },
    wrap: { value: wrap }
  });
}

Script.compile = function compile(code, name){
  try { return new vm.Script(code, name) }
  catch (e) {
    try { return new vm.Script('( '+code+'\n)', name) }
    catch (e2) { return e }
  }
}

Script.wrap = function wrap(script, name){
  return Object.create(Script.prototype, {
    name: { value: name || '', enumerable: true },
    code: { value: '"unknown";' },
    wrap: { value: script }
  });
}

Script.cache = {};
Script.fileCache = {};



Script.prototype = {
  constructor: Script,
  run: function run(context){
    if (this.wrap instanceof SyntaxError) {
      return { error: this.wrap };
    }
    var method = context ? 'runInContext' : 'runInNewContext';
    try { return this.wrap[method](context) }
    catch (e) { return { error: e } }
  },
  inspect: function inspect(formatter){
    var code = this.code.slice(0, 40);
    if (code.length === 40) code += '...';
    return '<Script ' + (this.name?' '+this.name:'') + quotes(code) + '>';
  }
}


function quotes(s) {
  s = String(s).replace(/\\/g, '\\\\');
  var q = ['"', "'"];
  var qMatch = [/(')/g, /(")/g];
  var qWith = +(s.match(qMatch[0]) === null);
  return q[qWith] + s.replace(qMatch[1-qWith], '\\$1') + q[qWith];
}



function resolve(name){
  var resolved = name;
  if (!exists(resolved)) {
    if (!exists(resolved = path._makeLong(name))) {
      if (!exists(resolved = path._makeLong(path.resolve(__dirname, name)))) {
        return false;
      }
    }
  }
  return resolved;
}


function sha(code){
  var shasum = crypto.createHash('sha1');
  shasum.update(code);
  return shasum.digest('hex');
}
