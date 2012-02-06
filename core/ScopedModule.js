var Module = require('module');
var path = require('path');
var fs = require('fs');
var vm = require('vm');
var natives = process.binding('natives');



module.exports = ScopedModule;


function ScopedModule(){
  Module.apply(this, arguments);
  this.scope = {};
  this.name = this.id;
}

ScopedModule._cache = {};
ScopedModule.main;


ScopedModule._load = function(request, parent, isMain){
  if (request in natives) return Module._load.apply(this, arguments);

  var filename = Module._resolveFilename(request, parent);
  var cachedModule = ScopedModule._cache[filename];
  if (cachedModule) {
    return cachedModule.exports;
  }

  var _module = new ScopedModule(filename, parent, 'module');

  if (isMain) {
    process.mainModule = _module;
    _module.id = '.';
  }

  ScopedModule._cache[filename] = _module;
  try {
    _module.load(filename);
  } catch (err) {
    delete ScopedModule._cache[filename];
    throw err;
  }

  return _module.exports;
}

ScopedModule.upgradeModule = function(_module){
  if (_module.constructor === Module) {
    _module.__proto__ = ScopedModule.prototype;
    _module.scope = {};
    _module.name = _module.id || _module.filename;
    if (_module.filename && _module.loaded === true) {
    }
    if (!ScopedModule.main) ScopedModule.main = _module
    var require = function require(path){
      return ScopedModule.prototype.require.call(_module, path)
    }
    require.resolve = function(request) {
      return Module._resolveFilename(request, _module);
    }
    require.extensions = Module._extensions;
    require.main = _module;
    require.cache = ScopedModule._cache;
    _module.require = require;
    return require;
  }
}


var standard = ['exports','require','module','__filename','__dirname'];

function jsIdentifier(name){
  return !/$[a-zA-Z_$][\w_$]*$/.test(name);
}


ScopedModule.wrap = function wrap(code, scope){
  var scope = Array.isArray(scope) ? scope : Object.getOwnPropertyNames(scope);
  var names = standard.concat(scope).filter(jsIdentifier);
  var wrapper = vm.runInThisContext('(function ('+names+'){ '+code+'\n})');
   
  function run(scope){
    return function(){
      "use strict";
      return wrapper.apply(this, names.map(function (s){ return scope[s] }));
    }.call(this.exports);
  }

  return Array.isArray(scope) ? run : run.call(scope, scope);
}



ScopedModule.prototype = {
  __proto__: Module.prototype,
  constructor: ScopedModule,

  _compile: function _compile(content, filename){
    var self = this;

    function require(path){
      return self.require(path);
    }

    require.resolve = function(request) {
      return Module._resolveFilename(request, self);
    }

    require.extensions = Module._extensions;
    require.cache = ScopedModule._cache;
    require.main = ScopedModule.main;

    var names = Object.getOwnPropertyNames(this.scope);
    var compiledWrapper = ScopedModule.wrap(content.replace(/^\#\!.*/, ''), names);

    var scopeArgs = Object.create(this.scope);
    scopeArgs.exports = this.exports;
    scopeArgs.require = require;
    scopeArgs.module = this;
    scopeArgs.__filename = filename;
    scopeArgs.__dirname = path.dirname(filename);

    return compiledWrapper.call(this, scopeArgs);
  },

  require: function require(path){
    return ScopedModule._load(path, this);
  }
}
