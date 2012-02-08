var Module = require('module');
var path = require('path');
var fs = require('fs');
var vm = require('vm');
var natives = process.binding('natives');

var explorePath = require('./utility/explorePath');


module.exports = ScopedModule;




function ScopedModule(){
  Module.apply(this, arguments);
  this.locals = {};
  delete this.children;
} 

ScopedModule._cache = {};
ScopedModule.main;
ScopedModule._deps = {};
ScopedModule._resolveFilename = Module._resolveFilename;
ScopedModule._depsPaths = [];


var depsCache = {};

function readDeps(request){
  if (typeof request === 'string') request = explorePath(request);
  if (!request.isDirectory())      request = request.getParent();
  if (request in depsCache)        return depsCache[request];

  var deps = request.resolve('.deps.json');
  if (!deps.exists())                  return depsCache[request] = [];

  try {
    return depsCache[request] = deps.read(JSON.parse);
  } catch (e) {
    e.path = deps.path;
    e.message = 'Error parsing ' + deps.path + ': ' + e.message;
    throw e;
  }
}


Object.defineProperties(ScopedModule, {
  _cache: _({}),
  main: _(null),

  _load: _(function _load(request, parent, isMain){
    if (request in natives) return Module._load.apply(this, arguments);

    var filename = Module._resolveFilename(request, parent);
    if (filename in ScopedModule._cache) return ScopedModule._cache[filename].exports;

    var _module = new ScopedModule(filename, parent);
    ScopedModule._cache[filename] = _module;

    if (isMain) {
      process.mainModule = _module;
      _module.id = '.';
    }


    var info = explorePath(filename);
    if (!info.isDirectory()) info = info.getParent();

    var imports = {};

    readDeps(info).forEach(function(rule){
      if (rule.receivers[0] === '*' || ~rule.receivers.indexOf(info.basename)) {
        rule.providers.forEach(function(provider){
          provider = info.resolve(provider);
          if (provider.isDirectory()) {
            provider.read(function(file){ imports[file] = file });
          } else {
            imports[provider] = provider;
          }
        });
      }
    });


    Object.keys(imports).forEach(function(name){
      this.locals[imports[name].toIdentifier()] = _module.require(name);
    }, _module);

    try { _module.load(filename) }
    catch (err) { delete ScopedModule._cache[filename]; throw err; }

    return _module.exports;
  }),

  wrap: _(function wrap(code, scope, name){
    var names = Array.isArray(scope) ? scope.slice() : Object.getOwnPropertyNames(scope);
    names = names.filter(jsIdentifier);
    var wrapper = vm.runInThisContext('(function ('+names+'){ '+code+'\n})', name);
     
    function run(scope){
      return function(){
        "use strict";
        return wrapper.apply(this, names.map(function(s){ return scope[s] }));
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

    var scopeArgs = Object.create(this.locals);
    scopeArgs.exports = this.exports;
    scopeArgs.require = require;
    scopeArgs.module = this;
    scopeArgs.__filename = filename;
    scopeArgs.__dirname = path.dirname(filename);

    var names = Object.getOwnPropertyNames(scopeArgs);
    var compiledWrapper = ScopedModule.wrap(content.replace(/^\#\!.*/, ''), names, filename);


    return compiledWrapper.call(this, scopeArgs);
  })
})



function _(v){ return { configurable: true, writable: true, value: v } }
