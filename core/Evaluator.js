var Context = require('./Context');
var Group = require('../lib/Group');



module.exports = Evaluator;


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
  get global(){ return this.contexts.current.global },
  get name(){ return this.contexts.current.name },
  get ctx(){ return this.contexts.current.ctx },
  set name(v){ this.contexts.current.name = v },

  view: function view(){
    return this.lastResult = this.contexts.current.view();
  },

  run: function run(code, callback){
    if (callback) {
      var self = this;
      this.contexts.current.run(code, function(result){
        self.lastResult = result;
        callback(result);
      });
    } else {
      return this.lastResult = this.contexts.current.run(code);
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