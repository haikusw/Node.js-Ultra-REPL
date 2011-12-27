var vm = require('vm');
var path = require('path');
var fs = require('fs');


var builtins = require('./builtins');


var names = [ 'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf',
              'hotel', 'india', 'juliet', 'kilo', 'lima', 'mike', 'november',
              'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango', 'uniform',
              'victor', 'whiskey', 'x-ray', 'yankee', 'zulu' ]


var ctxColors = [ 'bgreen', 'byellow', 'bmagenta', 'bcyan', 'yellow', 'magenta', 'cyan', 'bblue'];
ctxColors.index = 1;




module.exports = REPLContext;



var globalConfigured = false;

function REPLContext(isGlobal){
  this.isGlobal = !!isGlobal;
  this.name = isGlobal ? 'global' : names.shift();
  this.color = ctxColors[ctxColors.index++];
  ctxColors.index = ctxColors.index % ctxColors.length;
  this.inspector = loadScript('inspect.js');
  if (isGlobal) {
    if (globalConfigured) return global;
    this.ctx = global;
    globalConfigured = true;

    Object.defineProperties(global, {
      module:     { value: module },
      require:    { value: require },
      exports:    { get: function( ){ return module.exports; },
                    set: function(v){ module.exports = v;    } }
    });
    this.createInspector();
  } else {
    this.initialize();
  }
}


REPLContext.prototype = Object.create(Object.prototype, {
  constructor: __(REPLContext),
  hideBuiltins: __(false),
  showHidden: __(false),
  useColors: __(!process.env.NODE_DISABLE_COLORS),
  maxDepth: __(2),
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
    this.outputHandler(uuid, this.ctx);
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
  runCode: __(function runCode(code){
    if (this.isGlobal) {
      return vm.runInThisContext(code);
    } else {
      return vm.runInContext(code, this.ctx);
    }
  }),
  outputHandler: __(function outputHandler(id, ctx){
    var last, filter, inspect;
    var self = this;
    var handler = save;
    var thisGlobal = global === this.ctx ? global : vm.runInContext('this', this.ctx);

    function install(obj){
      filter = obj.filter;
      inspect = obj.inspect;
      handler = save;
    }

    function save(obj){ last = obj; }

    function format(){
      if (self.hideBuiltins && last === thisGlobal) {
        last = filter(last, builtins.all);
      }
      return inspect(last, self.showHidden, self.maxDepth, self.useColors);
    }

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


function __(val, h, r){
  var d = { configurable: true, enumerable: true, writable: true };
  if (h === true) {      d.enumerable = false;
    if (r === true)      d.readonly = false;
  } else if (r === true) d.readonly = false;
  d.value = val;
  return d;
}

function UUID(seed){
  return seed ? (seed^Math.random() * 16 >> seed / 4).toString(16)
              : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, UUID);
}