var vm = require('vm');
var path = require('path');
var fs = require('fs');

var loadScript = require('context-loader').loadScript;
var wrapCode = require('context-loader').wrap;

var settings = require('../settings');
var nameColors = settings.styling.context.names;
var nameIndex = 1;
var inspector = loadScript(path.resolve(__dirname, 'inspect.js'));
var contexts = new WeakMap;


module.exports = Context;


function Context(isGlobal){
  this.isGlobal = !!isGlobal;

  var name = isGlobal ? 'global' : settings.text.names.shift();
  var color = nameColors[nameIndex++];
  nameIndex = nameIndex % nameColors.length;
  Object.defineProperty(this, 'name', {
    get: function(){ return this.colors ? name.color(color) : color }
  });

  this.builtins = true;
  this.hiddens = false;
  this.protos = false;
  this.depth = 2;
  this.colors = !process.env.NODE_DISABLE_COLORS;

  this.scripts = [];
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

Context.prototype = {
  constructor: Context,
  initialize: function initialize(){
    this.ctx = vm.createContext();
    run('global = this', this.ctx);
    this.createInspector();
    settings.builtins.node.forEach(function(name){
      Object.defineProperty(this.ctx, name, Object.getOwnPropertyDescriptor(global, name));
    }, this);
    return this;
  },
  get ctx(){ return contexts.get(this) },
  set ctx(v){ contexts.set(this, v) },
  createInspector: function createInspector(){
    var uuid = UUID();
    this.outputHandler(uuid);
    run('_ = "' + uuid + '"', this.ctx);
    inspector.runInContext(this.ctx)
  },
  runScript: function runScript(script){
    this.scripts.push(script);
    this.ctx._ = 'snapshot';
    var result = script.runInContext(this.ctx).result;
    script.globals = this.ctx._;
    return result;
  },
  runCode: function runCode(code, filename){
    var script = wrapCode(code, filename);
    if (script) {
      return this.runScript(script);
    }
  },
  runFile: function runFile(filename){
    var script = loadScript(filename);
    if (script) {
      return this.runScript(script);
    }
  },
  clone: function clone(){
    var context = new Context;
    context.builtins = this.builtins;
    context.hiddens  = this.hiddens;
    context.depth = this.depth;
    context.colors = this.colors;
    this.scripts.forEach(function(script){ context.runScript(script) });
    return context;
  },
  getEntities: function getEntities(){
    this.ctx._ = 'filter';
    return this.ctx._;
  },
  outputHandler: function outputHandler(id){
    var last, filter, inspect, O, globals, combine;
    var handler = save;
    var thisGlobal = global === this.ctx ? global : vm.runInContext('this', this.ctx);
    var thisctx = this.ctx;
    function prop(name){
      if (thisctx === global) return global[name];
      return vm.runInContext('this['+name+']', thisctx);
    }

    function install(obj){
      filter = obj.filter;
      inspect = obj.inspect;
      combine = obj.combine;
      O = obj.O;
      handler = save;
    }

    function filtered(obj){
      format = output;
      return filter(thisGlobal, settings.builtins.all);
    }

    function snapshot(obj){
      format = output;
      globals = O('getOwnPropertyNames', thisGlobal).filter(function(n){
        return !~globals.indexOf(n) && !~settings.builtins.all.indexOf(n);
      });
      return globals;
    }

    function save(obj){
      last = { result: obj };
      if (globals) {
        last.globals = globals;
        globals = null;
      }
    }

    var output = function output(){
      if (typeof last === 'undefined') return '';
      var obj = last.result;
      if (!this.builtins && obj === thisGlobal) {
        obj = filter(obj, settings.builtins.all);
      }
      if (Object(obj) === obj && last.globals) {
        obj = combine(obj, filter(thisGlobal, last.globals, true));
      }
      return inspect(obj, this, settings.styling.inspector);
    }.bind(this);

    var format = output;

    Object.defineProperty(this.ctx, '_', {
      get: function( ){

        return format(last)
      },
      set: function(v){
        if (v === id) return handler = install;
        if (v === 'filter') return format = filtered;
        if (v === 'snapshot' && typeof O !== 'undefined') {
          globals = O('getOwnPropertyNames', thisGlobal);
          return format = snapshot;
        }
        handler(v);
      }
    });
  },
};


function UUID(seed){
  return seed ? (seed^Math.random() * 16 >> seed / 4).toString(16)
              : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, UUID);
}