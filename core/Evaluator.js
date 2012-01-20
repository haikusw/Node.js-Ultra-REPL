var util = require('util');
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var vm = require('vm');

var Iterable = require('../lib/Iterable').Iterable;
var Context = require('./Context');

var slice = Function.prototype.call.bind(Array.prototype.slice);


var tryContext = vm.createContext();


module.exports = Evaluator;

function Evaluator(){
  EventEmitter.call(this);

  this.contexts = new Iterable;
  this.current = new Context(true);
  this.iterator =  this.contexts.__iterator__();
  this.contexts.add('global', this.current);
  var self = this;
  patchRunInThisContext(this);
  Object.defineProperty(this.current, 'columns', { get: function(){ return self.columns } });
}


Evaluator.prototype = {
  __proto__: Object.create(EventEmitter.prototype),
  constructor: Evaluator,

  get index(){    return this.iterator.current  },
  get count(){    return this.contexts.count()  },
  get global(){   return this.current.global    },
  get ctx(){      return this.current.ctx       },

  get builtins(){ return this.current.builtins  },
  get hiddens(){  return this.current.hiddens   },
  get protos(){   return this.current.protos    },
  get colors(){   return this.current.colors    },
  get depth(){    return this.current.depth     },
  get name(){     return this.current.name      },
  get _(){        return this.current.ctx._     },

  set builtins(v){ this.current.builtins = v },
  set hiddens(v){  this.current.hiddens = v  },
  set protos(v){   this.current.protos = v   },
  set colors(v){   this.current.colors = v   },
  set depth(v){    this.current.depth = v    },
  set name(v){     this.current.name = v     },
  set _(v){        this.current.ctx._ = v    },

  add: function add(context){
    this.contexts.add(context.name, context);
    var self = this;
    Object.defineProperty(context, 'columns', { get: function(){ return self.columns } });
    this.iterator.current = this.contexts.count() - 1;
    return this.current = context;
  },

  create: function create(){
    return this.add(new Context);
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
    this.current = this.iterator.item();
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

  evaluate: function evaluate(code, finalize){
    var output = {
      status: 'success',
      code: code.trim(),
      result: this.current.syntaxCheck(code)
    };

    if (output.result instanceof SyntaxError) {
      output.status = 'syntax_error';

    } else {
      output.code = output.result;
      try {
        output.result = this.current.runCode(output.code, this.name, finalize);
        output.status = 'success';
        if (output.result !== 'async') {
          finalize(output)
        }
      } catch (e) {
        output.result = e;
        output.status = 'error';
      }
    }
    return output;
  }
};


function patchRunInThisContext(context){
  vm.runInThisContext = function(ritc){
    return function __runInThisContext(){
      if (context.ctx === global) {
        return ritc.apply(this, arguments);
      } else {
        var args = slice(arguments);
        args.splice(1, 1, context.ctx);
        return vm.runInContext.apply(this, args);
      }
    }
  }(vm.runInThisContext);

  vm.Script.prototype.runInThisContext = function(ritc){
    return function __runInThisContext(){
      if (context.ctx === global) {
        return ritc.apply(this, arguments);
      } else {
        var args = slice(arguments);
        args.splice(1, 1, context.ctx);
        return vm.runInContext.apply(this, args);
      }
    }
  }(vm.Script.prototype.runInThisContext);
}

//(function(){ try { x } catch (e) { return e } })()