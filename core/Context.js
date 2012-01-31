var vm = require('vm');

var Script = require('./Script');

var builtins = require('../lib/builtins');
var style = require('../settings/styling');
var defaults = require('../settings/options').inspector;
var names = require('../settings/text').names;
var namecolors = style.context.names;

var inspector = new Script(__dirname + '/inspect.js');

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
    id: { value: contexts.length },
    displayName: { value: this.name.color(namecolors[contexts.length % namecolors.length]) }
  });

  this.settings = Object.keys(defaults).reduce(function(r,s){
    return r[s] = defaults[s], r;
  }, {});

  this.initialize(globalSettings);
}

Context.prototype = {
  constructor: Context,

  get ctx(){ return contexts[this.id] },
  set ctx(v){ contexts[this.id] = v },

  get lastResult(){ return this.history.length && this.history[this.history.length-1] },

  initialize: function initialize(globalSettings){
    this.ctx = vm.createContext();
    Object.defineProperty(this, 'global', { value: vm.runInContext('this', this.ctx), writable: true });

    var init = inspector.run(this.ctx)(this.settings, globalSettings, builtins, style.inspector);
    this.inspector = init.inspector;
    this.getGlobals = init.globals;
    this.snapshot = init.snapshot;
    this.history = [];
    if (this.isGlobal) {
      this.setGlobal();

      Object.getOwnPropertyNames(global).forEach(function(prop){
        if (prop !== 'global' && prop !== 'root' && prop !== 'GLOBAL' && !(prop in this.ctx)) {
          Object.defineProperty(this.ctx, prop, Object.getOwnPropertyDescriptor(global, prop));
        }
      }, this);

      this.refresh();
    }
    return this;
  },

  view: function view(){
    return new Success(this, new Script('this'), this.global);
  },

  setGlobal: function setGlobal(){
    vm.runInContext('global = this', this.ctx);
  },

  refresh: function refresh(){
    vm.runInContext('this', this.ctx);
  },

  run: function run(script, callback){
    if (typeof script === 'string') {
      script = new Script(script);
    }
    if (script instanceof vm.Script) {
      script = Script.wrap(script);
    }
    this.snapshot();
    var outcome = script.run(this.ctx);
    var globals = this.snapshot();

    if (outcome && outcome.error) {
      var result = new Fail(this, script, outcome.error);
    } else {
      var result = new Success(this, script, outcome, globals);
    }
    if (callback) {
      var self = this;
      process.nextTick(function(){
        self.history.push(result);
        callback(result)
      });
    } else {
      return result;
    }
  },

  clone: function clone(){
    var context = new this.constructor(this.isGlobal);
    Object.keys(defaults).forEach(function(prop){
      context[prop] = this[prop];
    }, this);
    this.history.forEach(function(event){
      context.run(event.script);
    });
    return context;
  }
};


function Result(status, inspector, completion){
  if (!(this instanceof Result)) return new Result(status, inspector, completion);
  this.status = status;
  this.inspector = inspector;
  this.completion = completion;
}

Result.prototype = {
  completion: null,
  globals: null,
  error: null,
  status: null,
  script: null,
  inspector: null,
  isResult: true,
  get _completion(){
    return this.inspector && this.inspector(this.completion);
  },
  get _globals(){
    return this.inspector && this.inspector(this.globals);
  }
};

function Success(context, script, completion, globals){
  if (!(this instanceof Success)) return new Success(context, script, completion, globals);
  globals = globals || {};
  this.status = 'Success';
  this.completion = completion;
  this.globals = Object.keys(globals).length ? globals : null;
  this.script = script;
  this.inspector = context.inspector;
}

Success.prototype = Object.create(Result.prototype);

function Fail(context, script, error){
  if (!(this instanceof Fail)) return new Fail(context, script, error);
  this.status = error.name;
  this.error = error;
  this.script = script;
}

Fail.prototype = Object.create(Result.prototype);