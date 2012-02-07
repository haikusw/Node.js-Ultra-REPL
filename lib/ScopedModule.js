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


Object.defineProperties(ScopedModule, {
  _cache: _({}),
  main: _(null),

  _load: _(function _load(request, parent, isMain){
    if (request in natives) return Module._load.apply(this, arguments);

    var filename = Module._resolveFilename(request, parent);
    var cached = ScopedModule._cache[filename];
    if (cached) return cached.exports;

    var _module = new ScopedModule(filename, parent, 'module');

    if (isMain) {
      process.mainModule = _module;
      _module.id = '.';
    }

    ScopedModule._cache[filename] = _module;

    try { _module.load(filename) }
    catch (err) { delete ScopedModule._cache[filename]; throw err; }

    return _module.exports;
  }),

  upgradeModule: _(function upgradeModule(_module){
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
  }),

  wrap: _(function wrap(code, scope){
    var names = Array.isArray(scope) ? scope.slice() : Object.getOwnPropertyNames(scope);
    names = names.filter(jsIdentifier);
    var wrapper = vm.runInThisContext('(function ('+names+'){ '+code+'\n})');
     
    function run(scope){
      return function(){
        "use strict";
        return wrapper.apply(this, names.map(function (s){ return scope[s] }));
      }.call(this.exports);
    }

    return Array.isArray(scope) ? run : run.call(scope, scope);
  })
});




function jsIdentifier(name){
  return !/$[a-zA-Z_$][\w_$]*$/.test(name);
}


ScopedModule.prototype = Object.create(Module.prototype, {
  constructor: _(ScopedModule),
  require: _(function require(path){
    return ScopedModule._load(path, this);
  }),
  _compile: _(function _compile(content, filename){
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

    var scopeArgs = Object.create(this.scope);
    scopeArgs.exports = this.exports;
    scopeArgs.require = require;
    scopeArgs.module = this;
    scopeArgs.__filename = filename;
    scopeArgs.__dirname = path.dirname(filename);



    var names = Object.getOwnPropertyNames(scopeArgs);
    var compiledWrapper = ScopedModule.wrap(content.replace(/^\#\!.*/, ''), names);


    return compiledWrapper.call(this, scopeArgs);
  })
})



function _(v){ return { configurable: true, writable: true, value: v } }

