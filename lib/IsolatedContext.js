var vm = require('vm');
var path = require('path');
var fs = require('fs');


var __ = require('./object-utils').descriptor;


var builtins = require('../settings/builtins');
var style = require('../settings/styling');
var names = require('../settings/text').names;



var nameColors = style.contexts.names;
nameColors.index = 1;


module.exports = IsolatedContext;


var globalConfigured = false;

function IsolatedContext(columns, isGlobal){
  this.isGlobal = !!isGlobal;

  this.name = isGlobal ? 'global' : names.shift();
  this.color = nameColors[nameColors.index++];
  nameColors.index = nameColors.index % nameColors.length;

  this.builtins = true;
  this.hiddens = false;
  this.depth = 2;
  this.colors = !process.env.NODE_DISABLE_COLORS;
  this.columns = columns;

  this.inspector = loadScript('inspect.js');

  if (isGlobal) {
    if (globalConfigured) return global;
    globalConfigured = true;

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


IsolatedContext.prototype = Object.create(Object.prototype, {
  constructor: __(IsolatedContext),
  initialize: __(function initialize(){
    this.ctx = vm.createContext();
    this.runCode('global = this');
    this.createInspector();
    builtins.node.forEach(function(name){
      Object.defineProperty(this.ctx, name, Object.getOwnPropertyDescriptor(global, name));
    }, this);
    return this.ctx;
  }),
  createInspector: __(function createInspector(){
    var uuid = UUID();
    this.outputHandler(uuid);
    this.runCode('_ = "' + uuid + '"');
    this.runScript(this.inspector);
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
      return vm.runInThisContext(code, filename);
    } else {
      return vm.runInContext(code, this.ctx, filename);
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
      if (typeof last === 'undefined') return '';
      if (!this.builtins && last === thisGlobal) {
        last = filter(last, builtins.all);
      }
      return inspect(last, this, style.inspector);
    }.bind(this);

    Object.defineProperty(this.ctx, '_', {
      set: function(v){ if (v === id) return handler = install; handler(v); },
      get: function( ){ return format(last) }
    });
  }),
});





function loadScript(filepath) {
  var resolved = filepath;
  if (!path.existsSync(resolved)) {
    resolved = path.resolve(path.dirname(module.filename), resolved);
    if (!path.existsSync(resolved)) {
      resolved = path.resolve('../lib', resolved);
      if (!path.existsSync(resolved)) {
        throw new Error("File " + filepath + " not found");
      }
    }
  }
  var source = fs.readFileSync(resolved, 'utf8')
  var script = vm.createScript(source, path.basename(filepath));
  return script;
}



function UUID(seed){
  return seed ? (seed^Math.random() * 16 >> seed / 4).toString(16)
              : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, UUID);
}