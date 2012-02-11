var natives = process.binding('natives')
var repl;

module.exports = [
  {
    name: 'Stack Trace',
    help: 'View the live stack.',
    defaultTrigger: { type: 'keybind', trigger: 'alt+s' },
    action: function(){
      repl = this;
      this.context.current.refresh();
      return getStack().map(trace).join('\n');
    }
  },
  // {
  //   name: 'Stack Trace Fn',
  //   help: 'View the live stack.',
  //   defaultTrigger: { type: 'keybind', trigger: '.t' },
  //   action: function(cmd, fn){
  //     var result =getStack().find(fn)
  //     return ~result ? result.map(trace).join('\n') : null;
  //   }
  // }
];

var stack_holder = new Error
function stackPrepare(e,stacks) {
  var stack = stacks
  for (var p in stack[0]) {
    stack[p] = stack[0][p]
  }
  stack.find = function(fn) {
    for (var i=stack.length;i--;) {
      if (stack[i].getFunction() === fn) break;
    }
    return i;
  }
  return stack
}


function getStack(){
  var old = Error.prepareStackTrace;
  Error.prepareStackTrace = stackPrepare;
  Error.captureStackTrace(stack_holder, getStack);
  var stack = stack_holder.stack;
  Error.prepareStackTrace = old;
  return stack;
}


function space(n){ return repeat(' ', n) }
function repeat(s,n){ return ++n > 0 ? new Array(n).join(s+'') : '' }
function pad(s,n){
  s = s || '';
  var o = space(Math.abs(n) - s.alength);
  return n < 0 ? o + s : s + o;
}


function trace(_, i){
  var n = (' #'+(i+1)).color('bblack');
  var loc = new Location(_.getLineNumber(),
                         _.getColumnNumber(),
                         _.getPosition(),
                         _.getFileName(),
                         _.getEvalOrigin()).toString();

  var scope = new Scope(_.isConstructor(),
                        _.isToplevel(),
                        _.isNative(),
                        _.isEval()).toString();
                       //_.getThis(),
                       //_.getFunction()).inspect();

   
  var origin = new Origin(_.getFunctionName(),
                          _.getMethodName(),
                          _.getTypeName()).toString();



  return [
    [ pad(n,5), pad(loc.name+' '+loc.type, 40)          , loc.line     ],
    [ space(5), pad(scope.scope, 40)                               , loc.column   ],
    [ space(5), pad(origin.type + origin.method + origin.function, 40), loc.position ],
    [ origin.all ],
    [  ]
  ].map(function(s){return s.join('')}).join('\n') 
}




function Origin(fn, method, type){
  this.fn = fn;
  this.method = method;
  this.type = type;
  if (this.fn === this.method) this.method = '';
}

Origin.prototype.toString = originFormat;



function Location(column, line, pos, file, evalsite){
  this.column = column;
  this.line = line;
  this.position = pos;
  this.file = file; 
  this.name = path.basename(file);
  this.type = file === this.name ? file.slice(0,-3) in natives ? 'node' : 'js' : 'user';
  if (evalsite !== file) this.evalsite = evalsite;
}

Location.labels = ['column', 'line', 'position'];
Location.colors = { node: 'yellow', js: 'blue', user: 'green' };

Location.prototype.toString = locationFormat;



function Scope(){
  for (var k in arguments) {
    this[Scope.args[k]] = arguments[k];
  }
}

Scope.args = ['Constructor', 'Top', 'Native', 'Eval'];

Scope.prototype.toString = scopeFormat;




function originFormat(){
  return { function: this.fn.color('bcyan'),
           method: this.method ? this.method.color('cyan') + ' ' : '',
           type: this.type.color('bmagenta') + ' ' };
}


function locationFormat(){
  var where = Location.labels.map(function(field){
    return field.pad(-10).color('bblack') + ' ' + this[field].toString().color('white');
  }, this);

  var color = Location.colors[this.type];

  return { type: ('['+this.type+']').color('b'+color),
           file: this.file.color(color),
           name: this.name.color(color),
           column:   where[0],
           line:     where[1],
           position: where[2] };
}


function scopeFormat(){
  return Scope.args.map(function(s){
    return this[s] ? s.color('magenta') : '';
  }, this).join('');
}
