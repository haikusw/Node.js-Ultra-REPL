var path = require('path');
var vm = require('vm');

var ScopedModule = require('./ScopedModule');
var Results = require('./Results');
var Script = require('./Script');

var names = require('../data/text').names;
var builtins = require('../data/builtins');

var style = require('../settings/styling');
var options = require('../settings/options');
var namecolors = style.context.names;

var inspector = new Script(path.resolve(__dirname, './inspect.js'));

var contexts = [];



module.exports = Context;

function Context(globalSettings, isGlobal){
  if (isGlobal) {
    if (module.globalContext) return module.globalContext;
    Object.defineProperty(module, 'globalContext', { value: this });

    this.name = 'global';
    this.isGlobal = true;
  } else {
    this.name = names.shift();
  }

  Object.defineProperties(this, {
    id:           { value: contexts.length },
    displayName:  { value: this.name.color(namecolors[contexts.length % namecolors.length]) }
  });

  this.settings = Object.keys(options.inspector).reduce(function(r,s){
    return r[s] = options.inspector[s], r;
  }, {});

  this.initialize(globalSettings);
}


Context.presets = {
  node: function(){ return { source: global, properties: builtins.node } }
};




var mainFakeModule = new ScopedModule('.', null);
mainFakeModule.filename = path.resolve(__dirname, '..')
mainFakeModule.loaded = true;

Context.prototype = {
  constructor: Context,

  get ctx(){ return contexts[this.id] },
  set ctx(v){ contexts[this.id] = v },

  get lastResult(){ return this.history.length && this.history[this.history.length-1] },

  initialize: function initialize(globalSettings){
    this.presets = {};
    this.ctx = vm.createContext();
    Object.defineProperty(this, 'global', { value: vm.runInContext('this', this.ctx), writable: true });

    var init = inspector.run(this.ctx)(this.settings, globalSettings, builtins, style.inspector);
    for (var k in init) this[k] = init[k];
    this.history = [];
    if (this.isGlobal) {
      this.setGlobal();
      this.installPresets('node');
    }

    var fakename = path.resolve(__dirname, '..', this.name+'.repl.js');
    var _module = new ScopedModule(fakename, mainFakeModule);
    
    var _require = function(path){
      return _module.require(path);
    }
    _require.resolve = function(request){
      return ScopedModule._resolveFilename(request, _module);
    }

    _module.filename = fakename;
    _module.loaded = true;
    _module.locals = this.locals = {
      console: this.console,
      require: _require,
      module: _module,
      exports: _module.exports,
      __dirname: path.dirname(fakename),
      __filename: fakename
    };
    return this;
  },

  view: function view(){
    return new Results.Success(this, new Script('this'), this.global, null, 'Global Object');
  },

  setGlobal: function setGlobal(){
    vm.runInContext('global = this', this.ctx);
  },

  installPresets: function installPresets(name){
    if (name in this.presets) return false;
    var preset = Context.presets[name]();
    var decls = preset.properties.map(function(prop){
      this.define(prop, Object.getOwnPropertyDescriptor(preset.source, prop));
    }, this);
    this.refresh();
    this.presets[name] = true;
    return true;
  },

  refresh: function refresh(){
    vm.runInContext('this', this.ctx);
  },

  run: function run(script, noRecord, callback){
    if (typeof noRecord === 'function') {
      callback = noRecord, noRecord = false;
    }
    noRecord = noRecord === true;

    if (typeof script === 'string') {
      script = new Script(script);
    }
    if (script instanceof vm.Script) {
      script = Script.wrap(script);
    }

    this.snapshot();
    var outcome = this.settings.globalExec ? script.run(this.ctx) : script.scoped(this.ctx, this.locals);
    var globals = this.snapshot();

    if (outcome && outcome.error) {
      var result = new Results.Fail(this, script, outcome.error);
    } else {
      var result = new Results.Success(this, script, outcome, globals);
    }

    if (callback) {
      var self = this;
      process.nextTick(function(){
        if (!noRecord) self.history.push(result);
        callback(result)
      });
    } else {
      if (!noRecord) this.history.push(result);
      return result;
    }
  },

  clone: function clone(){
    var context = new this.constructor(this.isGlobal);
    Object.keys(options.inspector).forEach(function(prop){
      context[prop] = this[prop];
    }, this);
    this.history.forEach(function(event){
      context.run(event.script);
    });
    return context;
  }
};
