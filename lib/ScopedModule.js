var NativeModule, vm;
!function(mll){
  mll.push = function push(){
    NativeModule = Object.defineProperty(push.caller('native_module'), '_source', { enumerable: false });
    delete mll.push;
    return [].push.apply(mll, arguments);
  }
  vm = require('vm');
}(process.moduleLoadList);

var util = require('util');
var fs = require('fs');
var path = require('path');
var Module = require('module');
var natives = process.binding('natives');
var explorePath = require('./utility/explorePath');


NativeModule._cache.module.exports = module.exports = ScopedModule;



function ScopedModule(){
  Module.apply(this, arguments);
  this.locals = {};
  delete this.children;
}

var depsCache = {};

function readDeps(request){
  if (typeof request === 'string') request = explorePath(request);
  if (!request.isDir) request = request.parent;
  if (request in depsCache) return depsCache[request];

  var deps = request.resolve('.deps.json');
  if (!deps.exists()) return depsCache[request] = [];

  try {
    return depsCache[request] = deps.read(JSON.parse);
  } catch (e) {
    e.path = deps.path;
    e.message = 'Error parsing ' + deps.path + ': ' + e.message;
    throw e;
  }
}

Object.defineProperties(ScopedModule, {

  main: _(null),

  _resolveFilename: _(function _resolveFilename(request, parent) {
    if (NativeModule.exists(request)) {
      return request;
    }

    var resolvedModule = Module._resolveLookupPaths(request, parent);
    var id = resolvedModule[0];
    var paths = resolvedModule[1];

    var filename = Module._findPath(request, paths);
    if (!filename) {
      var err = new Error("Cannot find module '" + request + "'");
      err.code = 'MODULE_NOT_FOUND';
      throw err;
    }
    return filename;
  }),


  _load: _(function _load(request, parent, isMain){
    if (request in natives) return Module._load.apply(this, arguments);

    var resolved = ScopedModule._resolveFilename(request, parent);
    var filename = resolved;
    if (filename in ScopedModule._cache) return ScopedModule._cache[filename].exports;

    
    var _module = ScopedModule._cache[filename] = new ScopedModule(filename, parent);

    if (isMain) {
      process.mainModule = _module;
      _module.id = '.';
    }

    var info = explorePath(filename);
    if (!info.isDir) info = info.parent;

    var imports = {};

    readDeps(info).forEach(function(rule){
      if (rule.receivers[0] === '*' || ~rule.receivers.indexOf(info.basename)) {
        rule.providers.forEach(function(provider){
          if (NativeModule.exists(provider)) {
            imports[provider] = provider;
          } else {
              provider = info.resolve(provider);
            if (provider.isDir) {
              provider.read(function(file){ imports[file] = file });
            } else {
              imports[provider] = provider;
            }
          }
        });
      }
    });


    Object.keys(imports).forEach(function(name){
      if (NativeModule.exists(name)) {
        this.locals[imports[name]] = NativeModule.require(name);
      } else {
        this.locals[imports[name].toIdentifier()] = _module.require(name);
      }
    }, _module);


    try { _module.load(resolved) }
    catch (err) { delete ScopedModule._cache[filename]; throw err; }

    return _module.exports;
  }),

  _nodeModulePaths: _(function _nodeModulePaths(from){
    var paths = [];
    from = explorePath(from);
    while (!from.root) {
      from = from.parent;
      if (from.basename !== 'node_modules') {
        paths.push(from.resolve('node_modules').path);
      }
    }
    return paths;
  }),

  wrap: _(function wrap(code, scope, name){
    var names = Array.isArray(scope) ? scope.slice() : Object.getOwnPropertyNames(scope);
    names = names.filter(jsIdentifier);
    var wrapper = ScopedModule.wrapper[0]+names+ScopedModule.wrapper[1]+code+ScopedModule.wrapper[2];
    var wrapped = vm.runInThisContext(wrapper, name);
    
    function run(scope){
      return function(){
        "use strict";
        return wrapped.apply(this, names.map(function(s){ return scope[s] }));
      }.call(this.exports);
    }

    return Array.isArray(scope) ? run : run.call(scope, scope);
  }),

  _deps: _({}),
  wrapper: _(['(function (', '){', '\n});']),
  _debug: _(Module._debug),

  runMain: _(function(){ return ScopedModule._load(process.argv[1], null, true) }),
  requireRepl: _(function(){ return ScopedModule._load('repl', '.') }),
});

ScopedModule.__proto__ = Module;
//Module.globalPaths
//Module._cache
//Module._findPath
//Module._resolveLookupPaths
//Module._resolveFilename
//Module._initPaths
//Module._pathCache
//Module._realpathCache
//Module._extensions
//Module._contextLoad



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
      return ScopedModule._resolveFilename(request, self);
    }

    require.extensions = Module._extensions;
    require.cache = Module._cache;
    require.main = ScopedModule.main;

    var scopeArgs = Object.create(this.locals);
    scopeArgs.exports = this.exports;
    scopeArgs.require = require;
    scopeArgs.module = this;
    scopeArgs.__filename = filename;
    scopeArgs.__dirname = path.dirname(filename);

    var names = Object.getOwnPropertyNames(this.locals).concat(Object.keys(scopeArgs));
    var compiledWrapper = ScopedModule.wrap(content.replace(/^\#\!.*/, ''), names, filename);

    return compiledWrapper.call(this, scopeArgs);
  })
});



function _(v){ return { configurable: true, writable: true, value: v } }


