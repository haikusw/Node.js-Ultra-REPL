var vm = require('vm');
var path = require('path');
var fs = require('fs');

var loadScript = require('context-loader').loadScript;

var __ = require('./object-utils').descriptor;
var settings = require('../settings');
var nameColors = settings.styling.context.names;
var nameIndex = 1;
var inspector = loadScript(path.resolve(__dirname, 'inspect.js'));
var contexts = new WeakMap;




function Context(isGlobal){
  this.isGlobal = !!isGlobal;

  var name = isGlobal ? 'global' : settings.text.names.shift();
  var color = nameColors[nameIndex++];
  Object.defineProperty(this, 'name', __(function getter(){
    return this.colors ? name.color(color) : color;
  }));

  nameIndex = nameIndex % nameColors.length;

  this.builtins = true;
  this.hiddens = false;
  this.depth = 2;
  this.colors = !process.env.NODE_DISABLE_COLORS;



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
module.exports = Context;


Context.prototype = Object.create(Object.prototype, {
  constructor: __(Context),
  initialize: __(function initialize(){
    this.ctx = vm.createContext();
    this.runCode('global = this');
    this.createInspector();
    settings.builtins.node.forEach(function(name){
      Object.defineProperty(this.ctx, name, Object.getOwnPropertyDescriptor(global, name));
    }, this);
    return this;
  }),
  ctx: __([
    function(){ return contexts.get(this) },
    function(v){ contexts.set(this, v) }
  ]),
  createInspector: __(function createInspector(){
    var uuid = UUID();
    this.outputHandler(uuid);
    this.runCode('_ = "' + uuid + '"');
    inspector.runInContext(this.ctx);
  }),
  runScript: __(function runScript(script){
    if (this.isGlobal) {
      return script.runInThisContext();
    } else {
      return script.runInContext(this.ctx);
    }
  }),
  runCode: __(function runCode(code, filename){
    if (this.isGlobal) {
      return vm.runInThisContext(code, filename || this.name);
    } else {
      return vm.runInContext(code, this.ctx, filename || this.name);
    }
  }),
  runFile: __(function runFile(filename){
    var script = loadScript(filename);
    if (script) {
      return script.runInContext(this.ctx).result;
    }
  }),
  outputHandler: __(function outputHandler(id){
    var last, filter, inspect;
    var handler = save;
    var thisGlobal = global === this.ctx ? global : vm.runInContext('this', this.ctx);

    function install(obj){
      filter = obj.filter;
      inspect = obj.inspect;
      handler = save;
    }

    function save(obj){ last = obj; }

    var format = function(){
      var obj = last;
      if (typeof last === 'undefined') return '';
      if (!this.builtins && last === thisGlobal) {
        obj = filter(obj, settings.builtins.all);
      }
      return inspect(obj, this, settings.styling.inspector);
    }.bind(this);

    Object.defineProperty(this.ctx, '_', __([
      function( ){ return format(last) },
      function(v){ if (v === id) return handler = install; handler(v); }
    ], true));
  }),
});





function UUID(seed){
  return seed ? (seed^Math.random() * 16 >> seed / 4).toString(16)
              : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, UUID);
}

