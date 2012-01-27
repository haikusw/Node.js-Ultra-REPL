var vm = require('vm');
var path = require('path');
var fs = require('fs');

var loader = require('context-loader');

var builtins = require('../lib/builtins');

var style = require('../settings/styling');
var defaults = require('../settings/options').inspector;
var names = require('../settings/text').names;

var nameColors = style.context.names;
var nameIndex = 1;
var inspector = loader.loadScript(path.resolve(__dirname, 'inspect.js'));

var contexts = new WeakMap;
var scripts = new WeakMap;

var runInThisContext = vm.runInThisContext;


var tryContext = vm.createContext();
run('this', tryContext);



module.exports = Context;

function Context(isGlobal){
  Object.keys(defaults).forEach(function(s){ this[s] = defaults[s] }, this);

  this.initialize();

  if (isGlobal) {
    if (module.globalContext) return module.globalContext;
    Object.defineProperty(module, 'globalContext', { value: this });
    this.isGlobal = true;
    this.name = 'global';


    function Module(id, parent) {
      this.id = id;
      this.exports = {};
      this.parent = parent;
      this.filename = path.resolve(__dirname, '..');
      this.loaded = true;
      this.exited = false;
      this.children = [];
    }
    Module.prototype.constructor = function Module(){};

    var mod = new Module('.', null);
    var req = function(req){ return function require(path){ return req(path) } }(require);

    Object.getOwnPropertyNames(global).forEach(function(prop){
      if (prop !== 'global' && prop !== 'root' && prop !== 'GLOBAL' && !(prop in this.ctx)) {
        Object.defineProperty(this.ctx, prop, Object.getOwnPropertyDescriptor(global, prop));
      }
    }, this);

    Object.defineProperties(this.ctx, {
      module:  { value: mod },
      require: { value: req },
      exports: { get: function( ){ return mod.exports; },
                 set: function(v){ mod.exports = v;    } },
      global:  { value: this.global, enumerable: true, writable: true, configurable: true },
    });

    run('this', this.ctx);

  } else {
    this.name = newName();
  }
}

Context.prototype = {
  constructor: Context,

  get ctx(){ return contexts.get(this) },
  set ctx(v){ contexts.set(this, v) },

  initialize: function initialize(){
    // initialize context
    this.ctx = vm.createContext();
    // the wrapper Context object is different from the actual global
    Object.defineProperty(this, 'global', { value: run('this', this.ctx) });

    // hide 'Proxy' if --harmony until V8 correctly makes it non-enumerable
    'Proxy' in global && run('Object.defineProperty(this, "Proxy", { enumerable: false })', this.ctx);

    this.createInspector();
    scripts.set(this, []);
    this.history = [];
    return this;
  },

  createInspector: function createInspector(){
    var uuid = UUID();
    this.outputHandler(uuid);
    run('_ = "' + uuid + '"', this.ctx);
    inspector.runInContext(this.ctx);
  },

  globals: function globals(){
    return run('(function(g){return Object.getOwnPropertyNames(g).reduce(function(r,s){if(s!=="_")r[s]=g[s];return r},{})})(this)', this.ctx);
  },

  syntaxCheck: function syntaxCheck(src){
    //src = (src || '').replace(/^\s*function\s*([_\w\$]+)/, '$1=function $1');
    var result = parsify(src);
    if (result === true) return src;
    src += ';';
    if (parsify(src) === true) return src;
    src = '( ' + src + '\n)';
    if (parsify(src) === true) return src;
    return result;
  },

  runScript: function runScript(script){
    scripts.get(this).push(script);
    var globals = this.globals();
    var result = {
      completion: script.runInContext(this.ctx).result,
      globals: diffObject(this.globals(), globals)
    };
    script.globals = Object.keys(result.globals);
    this.history.push({
      code: script.code,
      result: result,
      globals: script.globals
    });
    return result;
  },

  runCode: function runCode(code, filename){
    return this.runScript(loader.wrap(code, filename));
  },

  runFile: function runFile(filename){
    return this.runScript(loader.loadScript(filename));
  },

  clone: function clone(){
    var context = new (Object.getPrototypeOf(this).constructor);
    context.builtins = this.builtins;
    context.hiddens = this.hiddens;
    context.colors = this.colors;
    context.depth = this.depth;
    this.scripts.forEach(context.runScript.bind(context));
    return context;
  },

  outputHandler: function outputHandler(id){
    var last, inspect, filter;
    var handler = save;

    function install(obj){
      filter = obj.filter;
      inspect = obj.inspect;
      handler = save;
    }

    function save(obj){
      last = obj;
    }

    var format = function(){
      if (typeof last === 'undefined') return '';

      var obj = last;

      if (!this.builtins && (obj === this.global || obj === this.ctx)) {
        obj = filter(obj, builtins.all);
      }

      return inspect(obj, this, style.inspector);
    }.bind(this);

    Object.defineProperty(this.ctx, '_', {
      get: function( ){ return format() },
      set: function(v){
        if (v === id) return handler = install;
        handler(v);
      }
    });
  },
};

function inArray(arr, val){
  return arr.some(function(s){ return egal(arr[s], val) });
}

function diffArray(arr, diff){
  return arr.filter(function(s){ return !inArray(diff, s) });
}

function diffObject(obj, diff){
  return Object.getOwnPropertyNames(obj).reduce(function(r,s){
    if (!inObject(diff, obj[s])) {
      r[s] = obj[s];
    }
    return r;
  }, {});
}

function inObject(obj, val){
  return Object.getOwnPropertyNames(obj).some(function(s){ return egal(obj[s], val) });
}


function egal(a, b){
  return a === b ? a !== 0 || 1 / a === 1 / b : a !== a && b !== b;
}


function UUID(seed){
  return seed ? (seed^Math.random() * 16 >> seed / 4).toString(16)
              : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, UUID);
}


function run(code, ctx, name){
  if (ctx === global) {
    return runInThisContext(code, name || 'global');
  } else {
    return vm.runInContext(code, ctx, name);
  }
}

function parsify(src){
  try { return run('1&&function(){\n'+src+'\n}', tryContext), true; }
  catch (e) { return e }
}

function newName(){
  return names.shift().color(nameColors[nameIndex++ % nameColors.length]);
}