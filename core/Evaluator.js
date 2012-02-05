var Context = require('./Context');
var Group = require('../lib/Group');



module.exports = Evaluator;


[ 'assert', 'debug', 'error', 'watchFile',
  'unwatchFile', 'mixin', 'createChildProcess',
  'inherits', '_byteLength'
].forEach(function(s){ delete process[s] });


function Evaluator(settings){
  this.contexts = new Group;
  this.settings = settings;
  this.create(true);
  this.history = [];
}

Evaluator.prototype = {
  constructor: Evaluator,

  get index(){ return this.contexts.index },
  get count(){ return this.contexts.length },
  get current(){ return this.contexts.current },
  get inspector(){ return this.contexts.current.inspector },
  get displayName(){ return this.contexts.current[this.settings.colors ? 'displayName' : 'name'] },
  get global(){ return this.contexts.current.global },
  get name(){ return this.contexts.current.name },
  get ctx(){ return this.contexts.current.ctx },
  get local(){ return this.contexts.current.local },
  set name(v){ this.contexts.current.name = v },

  view: function view(){
    return this.lastResult = this.contexts.current.view();
  },

  run: function run(code, noRecord, callback){
    if (typeof noRecord === 'function') {
      callback = noRecord, noRecord = false;
    }
    if (callback) {
      var self = this;
      this.contexts.current.run(code, noRecord, function(result){
        if (!noRecord) self.lastResult = result;
        callback(result);
      });
    } else {
      var result = this.contexts.current.run(code, noRecord);
      if (!noRecord) this.lastResult = result;
      return result;
    }
  },

  create: function create(isGlobal){
    var context = this.contexts.append(new Context(this.settings, isGlobal));
    this.contexts.last();
    return context;
  },

  next: function next(){
    return this.contexts.next();
  },

  prev: function prev(){
    return this.contexts.prev();
  },

  remove: function remove(){
    if (this.current.isGlobal) {
      return new Error("can't remove global");
    }
    return this.contexts.remove();
  },

  reset: function reset(){
    return this.contexts.current.initialize(this.settings);
  },
};