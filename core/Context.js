var vm = require('vm');
var path = require('path');
var fs = require('fs');

var loader = require('context-loader');

var builtins = require('../lib/builtins');

var defaults = require('../settings/options').inspector;
var names = require('../settings/text').names;
var style = require('../settings/styling');

var nameColors = style.context.names;
var nameIndex = 1;
var inspector = loader.loadScript(path.resolve(__dirname, 'inspect.js'));
var contexts = new WeakMap;

module.exports = Context;



function Context(isGlobal){
  Object.defineProperty(this, 'name', function(color){
    var name = names.shift();
    return {
      get: function(){ return this.colors ? name.color(color) : name },
      set: function(v){ name = v }
    };
  }(nameColors[nameIndex++ % nameColors.length]));

  Object.keys(defaults).forEach(function(s){ this[s] = defaults[s] }, this);

  this.scripts = [];
  this.history = [];
  this.errors = [];

  if (isGlobal) {
    if (module.globalConfigured) return global;
    module.globalConfigured = true;

    this.ctx = global;

    Object.defineProperties(global, {
      module:   { value: module },
      require:  { value: require },
      exports:  { get: function( ){ return module.exports; },
                  set: function(v){ module.exports = v;    } }
    });
    this.createInspector();
  } else {
    this.initialize();
  }
}

function run(code, ctx, name){
  if (ctx === global) {
    return vm.runInThisContext(code, name || 'global');
  } else {
    return vm.runInContext(code, ctx, name);
  }
}


function NotCompiledScript(code, name){
  var props = {
    code: { value: code, enumerable: true },
    runInContext: {
      value: function runInContext(context){
        return vm.runInContext(code, context, name);
      }
    }
  };
  if (name) props.name = { value: name, enumerable: true, writable: true };
  Object.defineProperties(this, props);
}

Context.prototype = {
  constructor: Context,

  get ctx(){ return contexts.get(this) },
  set ctx(v){ contexts.set(this, v) },

  initialize: function initialize(){
    this.ctx = vm.createContext();
    // initialize context
    run('this', this.ctx);
    // hide 'Proxy' if --harmony until V8 correctly makes it non-enumerable
    'Proxy' in global && run('Object.defineProperty(this, "Proxy", { enumerable: false })', this.ctx);
    this.createInspector();
    return this;
  },

  createInspector: function createInspector(){
    var uuid = UUID();
    this.outputHandler(uuid);
    run('_ = "' + uuid + '"', this.ctx);
    inspector.runInContext(this.ctx);
  },

  globals: function globals(){
    return run('Object.getOwnPropertyNames(this)', this.ctx);
  },

  runScript: function runScript(script){
    this.scripts.push(script);
    var globals = this.globals();
    var result = script.runInContext(this.ctx).result;
    script.globals = this.globals().filter(function(s){ return !~globals.indexOf(s) });
    var ctx = this.ctx;
    globals = script.globals.reduce(function(r, s){
      r[s] = ctx[s];
      if (ctx[s] === result) result = r;
      return r;
    }, run('({})', this.ctx));
    return result;
  },

  runCode: function runCode(code, filename){
    var script = loader.wrap(code, filename);
    return this.runScript(script);
  },

  runFile: function runFile(filename){
    var script = loader.loadScript(filename);
    if (script) {
      return this.runScript(script);
    }
  },

  clone: function clone(){
    var context = new Context;
    context.builtins = this.builtins;
    context.hiddens  = this.hiddens;
    context.colors = this.colors;
    context.depth = this.depth;
    this.scripts.forEach(function(script){ context.runScript(script) });
    return context;
  },

  outputHandler: function outputHandler(id){
    var last, filter, inspect;
    var handler = save;
    var ctx = this.ctx;
    var thisGlobal = global === this.ctx ? global : vm.runInContext('this', this.ctx);

    function prop(name){
      if (ctx === global) return global[name];
      return vm.runInContext('this['+name+']', ctx);
    }

    function install(obj){
      filter = obj.filter;
      inspect = obj.inspect;
      handler = save;
    }

    function filtered(obj){
      format = output;
      return filter(thisGlobal, builtins.all);
    }

    function save(obj){
      last = obj;
    }

    var output = function output(){
      if (typeof last === 'undefined') return '';

      var obj = last;

      if (!this.builtins && obj === thisGlobal) {
        obj = filter(obj, builtins.all);
      }

      return inspect(obj, this, style.inspector);
    }.bind(this);

    var format = output;

    Object.defineProperty(this.ctx, '_', {
      get: function( ){ return format(last) },
      set: function(v){
        if (v === id) return handler = install;
        if (v === 'filter') return format = filtered;
        handler(v);
      }
    });
  },
};


function UUID(seed){
  return seed ? (seed^Math.random() * 16 >> seed / 4).toString(16)
              : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, UUID);
}