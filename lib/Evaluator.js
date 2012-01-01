var util = require('util');
var path = require('path');
var EventEmitter = require('events').EventEmitter;

var Iterable = require('./Iterable').Iterable;
var Context = require('./Context');

var __ = require('./object-utils').descriptor;

module.exports = Evaluator;

function Evaluator(){
  EventEmitter.call(this)
  this.contexts = new Iterable;
  this.current = new Context(true);
  this.iterator =  this.contexts.__iterator__();
  this.contexts.add('global', this.current);
  var self = this;
  Object.defineProperty(this.current, 'columns', { get: function(){ return self.columns } });
  this.tryContext = new Context;
  this.tryContext.name = 'TryContext';
}
util.inherits(Evaluator, EventEmitter);


Evaluator.prototype = Object.create(EventEmitter.prototype, {
  constructor: __(Evaluator),

  ctx:         __(function getter( ){ return this.current.ctx       }),
  name:        __(function getter( ){ return this.current.name      }),
  count:       __(function getter( ){ return this.contexts.count()  }),
  index:       __(function getter( ){ return this.iterator.current  }),

  builtins:   __([function getter( ){ return this.current.builtins   },
                  function setter(v){ this.current.builtins = v      }]),

  hiddens:    __([function getter( ){ return this.current.hiddens    },
                  function setter(v){ this.current.hiddens = v       }]),

  colors:     __([function getter( ){ return this.current.colors     },
                  function setter(v){ this.current.colors = v        }]),

  depth:      __([function getter( ){ return this.current.depth      },
                  function setter(v){ this.current.depth = v         }]),

  _:          __([function getter( ){ return this.current.ctx._      },
                  function setter(v){ this.current.ctx._ = v         }]),

  create: __(function create(){
    var context = new Context();
    this.contexts.add(context.name, context);
    var self = this;
    Object.defineProperty(context, 'columns', { get: function(){ return self.columns } });
    this.emit('create', this.iterator.last());
  }),

  change: __(function change(to){
    var context = this.iterator.advance(to);
    if (context && this.current.ctx === context.ctx) {
      this.emit('error', 'no other contexts');
      return false;
    }
    this.current = context;
    this.emit('change', context);
  }),

  remove: __(function remove(){
    if (this.current.ctx === global) {
      this.emit('error', "can't remove global");
      return false;
    }
    var name = this.current.name;
    this.contexts.remove(this.current.name);
    this.current = this.iterator.getCurrent();
    this.emit('remove', name);
  }),

  reset: __(function reset(){
    if (this.current.ctx === global) {
      this.emit('error', "can't reset global");
      return false;
    }
    for (var i in require.cache) {
     delete require.cache[i];
    }

    this.emit('reset', this.current.initialize());
  }),

  inspector: __(function inspector(obj, context){
    context = context || this.current.ctx;
    context._ = obj;
    return context._;
  }),

  evaluate: __(function evaluate(code){
    code = trim(code);
    var result = softTry(code);
    if (result.name === 'SyntaxError') {
      return {
        result: result,
        status: 'syntax error',
        output: this.inspector(result, 'SoftChecker'),
        code: code
      };
    }
    code = result;
    try {
      result = this.tryContext.runCode(code);
    } catch (e) {
      if (isSyntaxError(e)) {
        return {
          result: e,
          status: 'syntax error',
          output: this.inspector(e, this.tryContext),
          code: code
        };
      }
    }
    try {
      result = this.current.runCode(code);
    } catch (e) {
      return {
        result: e,
        status: 'error',
        output: this.inspector(e),
        code: code
      };
    }
    return {
      result: result,
      status: 'success',
      code: code,
      output: this.inspector(result)
    };
  })
});


function isSyntaxError(e) {
  e = e && (e.stack || e.toString() || e.name);
  return e && e.match(/^SyntaxError/) &&
         !(e.match(/^SyntaxError: Unexpected token .*\n/) &&
         e.match(/\n    at Object.parse \(native\)\n/));
}

function parsify(src){
  try {
    Function(src);
    return true;
  } catch (e) {
    return e;
  }
}



function softTry(src){
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

function trim(cmd) {
  var trimmer = /^\s*(.+)\s*$/m,
      matches = trimmer.exec(cmd);

  if (matches && matches.length === 2) {
    return matches[1];
  }
}