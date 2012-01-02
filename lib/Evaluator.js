var util = require('util');
var path = require('path');
var EventEmitter = require('events').EventEmitter;

var Iterable = require('./Iterable').Iterable;
var Context = require('./Context');

module.exports = Evaluator;

function Evaluator(){
  EventEmitter.call(this);
  this.contexts = new Iterable;
  this.current = new Context(true);
  this.iterator =  this.contexts.__iterator;
  this.contexts.add('global', this.current);
  var self = this;
  Object.defineProperty(this.current, 'columns', { get: function(){ return self.columns } });
  this.tryContext = new Context;
  this.tryContext.name = 'TryContext';
}


Evaluator.prototype = {
  __proto__: Object.create(EventEmitter.prototype),
  constructor: Evaluator,

  get index(){    return this.iterator.current },
  get count(){    return this.contexts.count() },
  get ctx(){      return this.current.ctx      },

  get builtins(){ return this.current.builtins },
  get hiddens(){  return this.current.hiddens  },
  get colors(){   return this.current.colors   },
  get depth(){    return this.current.depth    },
  get name(){     return this.current.name     },
  get _(){        return this.current.ctx._    },

  set builtins(v){ this.current.builtins = v },
  set hiddens(v){  this.current.hiddens = v  },
  set colors(v){   this.current.colors = v   },
  set depth(v){    this.current.depth = v    },
  set name(v){     this.current.name = v     },
  set _(v){        this.current.ctx._ = v    },

  create: function create(){
    var context = new Context;
    this.contexts.add(context.name, context);
    var self = this;
    Object.defineProperty(context, 'columns', { get: function(){ return self.columns } });
    this.iterator.current = this.contexts.count() - 1;
    return this.current = context;
  },

  change: function change(to){
    var context = this.iterator.advance(to);
    if (context && this.current.ctx === context.ctx) {
      return new Error("no other contexts");
    }
    return this.current = context;
  },

  remove: function remove(){
    if (this.current.ctx === global) {
      return new Error("can't remove global");
    }
    var current = this.current;
    this.contexts.remove(this.current.name);
    if (this.iterator.current === this.contexts.count()) {
      this.iterator.current--;
    }
    this.current = this.iterator.getCurrent();
    return current;
  },

  reset: function reset(){
    if (this.current.ctx === global) {
      return new Error("can't reset global");
    }
    for (var i in require.cache) {
     delete require.cache[i];
    }
    return this.current.initialize();
  },

  inspector: function inspector(obj, context){
    context = context || this.current.ctx;
    context._ = obj;
    return context._;
  },

  evaluate: function evaluate(code){
    code = code.trim();
    var result = syntaxTry(code);
    if (result.name === 'SyntaxError') {
      return { result: result, status: 'syntax error', code: code, output: this.inspector(result, 'SyntaxCheck') };
    }
    code = result;
    try {
      result = this.tryContext.runCode(code);
    } catch (e) {
      if (result.name === 'SyntaxError') {
        return { result: e, status: 'syntax error', code: code, output: this.inspector(e, this.tryContext)  };
      }
    }
    try {
      result = this.current.runCode(code);
    } catch (e) {
      return { result: e, status: 'error', code: code, output: this.inspector(e) };
    }
    return { result: result, status: 'success', code: code, output: this.inspector(result) };
  }
};


function parsify(src){
  try {
    Function(src);
    return true;
  } catch (e) {
    return e;
  }
}

function syntaxTry(src){
  var result, errors = [];
  if ((result = parsify(src)) === true) return src;
  src += ';'
  errors.push(result)
  if ((result = parsify(src)) === true) return src;
  src = '( ' + src + '\n)';
  errors.push(result)
  if ((result = parsify(src)) === true) return src;
  errors.push(result)
  return errors[0];
}