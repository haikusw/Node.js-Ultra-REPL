var path = require('path');
var style = require('../settings/styling');

module.exports = [{
  name: 'Stack Trace',
  help: 'View the live stack.',
  defaultTrigger: { type: 'keybind', trigger: 'alt+s' },
  action: function(){
    return getStack().map(trace).join('\n');
  }
}];


var stack_holder = new Error;

function stackPrepare(e, stacks){
  var stack = stacks
  for (var p in stack[0]) {
    stack[p] = stack[0][p]
  }
  stack.find = function(fn) {
    for (var i=0;i<stack.length;i++) {
      if (stack[i].getFunction() === fn) return i
    }
    return -1;
  }
  return stack;
}

function getStack(){
  var old = Error.prepareStackTrace;
  Error.prepareStackTrace = stackPrepare;
  Error.captureStackTrace(stack_holder, getStack);
  var stack = stack_holder.stack;
  Error.prepareStackTrace = old;
  return stack;
}

function trace(_, i){
  var num = (' #'+(i+1)).color('bblack');
  var loc = new Location(_.getLineNumber(),
                         _.getColumnNumber(),
                         _.getPosition(),
                         _.getFileName(),
                         _.getEvalOrigin()).inspect();

 var scope =      new Scope(_.isConstructor(),
                            _.isToplevel(),
                            _.isNative(),
                            _.isEval()).inspect()
                            _.getThis(),
                            _.getFunction();

   
 var origin =    new Origin(_.getFunctionName(),
                            _.getMethodName(),
                            _.getTypeName()).inspect();

  return [
    [pad(num, 5), pad(loc[0] + space(1) + loc[2], 60),            pad(loc[3], -10) ],
    [   space(5), space(60),                                      pad(loc[4], -10) ],
    [   space(5), pad(origin[0]+space(1)+origin[1], 60),          pad(loc[5], -10) ],
    [scope]
  ].map(function(s){return s.join('')}).join('\n') 
}
// pad(scope, -10),


function space(n){ return repeat(' ', n) }
function repeat(s,n){ return ++n > 0 ? new Array(n).join(s+'') : '' }
function pad(s,x){
  s = s || '';
  var o = space(Math.abs(x) - s.alength);
  return x < 0 ? o + s : s + o;
}


var brackets = ['[','|',']']


function Origin(fn, method, type){
  fn && (this.fn = fn);
  method && (this.method = method);
  type && (this.type = type);
  if (this.fn && ~this.fn.indexOf('.')) {
    this.fn = this.fn.split(/\./g);
    if (this.method === this.fn[1]) {
      if (this.type === this.fn[0]) {
        this.source = 'own';
      } else {
        this.source = 'inherit';
        this.ancestor = this.fn[0];
        this.fn = this.fn[1];
      }
    }
  }
  if (this.fn === this.method) {
    delete this.method;
  }
}


Origin.prototype.inspect = function inspect(){
  var out = ['', ''], fn='';
  if (this.fn) {
    if (!Array.isArray(this.fn)) this.fn = [this.fn];
    fn = '.' + this.fn.map(function(s){ return s.color('bcyan')}).join('.');
  }
  if (this.type) {
    out[1] = this.type.color('bmagenta') + fn;
  }
  if (this.source === 'inherit') {
    out[1] = 'as '.color('bred') + out[1]
    out[0] = this.ancestor.color('bblue') + fn;
  }
  return out;
}
process.dpaths = [];
Origin.prototype.toString = Origin.prototype.inspect;

var natives = process.binding('natives');

function Location(line, column, pos, file, evalsite){
  this.line = line;
  this.column = column;
  this.position = pos;
  if (!~file.indexOf('\\') && !~file.indexOf('/')) {
    if (file.slice(0,-3) in natives) {
      this.file = file;
      this.type = 'node';
    } else {
      this.file = file;
      this.type = 'js';
    }
  } else {
    process.dpaths.push(file)
    this.file = path.relative(path.resolve(__filename, '..', 'core'), file);
    this.type = 'user';
  }
  this.name = path.basename(file);
  if (evalsite !== file) this.evalsite = evalsite;
}

Location.prototype.inspect = function inspect(){
  var type, name;
  var file;
  var numbers = [this.line,  this.column, this.position];
  var labels = ['Line', 'Col', 'Pos'];
  
  switch (this.type) {
    case 'node':type = ('['+this.type+']').color('yellow'); file = this.file.color('byellow'); break;
    case 'js':  type = ('['+this.type+']').color('cyan'); file = this.file.color('bcyan'); break;
    case 'user':type = ('['+this.type+']').color('green'); file = this.file.color('bgreen'); break;
  }


   numbers = numbers.map(function(s){ return (''+s).pad(10).color('white') })
   labels = labels.map(function(s){ return s.color('bblack').pad(-5) })
   

  return [ type,
           file,
           this.name.color('bgreen'),
           labels[0] + space(1) + numbers[0],
           labels[1] + space(1) + numbers[1],
           labels[2] + space(1) + numbers[2] ]
    


};

Location.prototype.toString = Location.prototype.inspect;

function Scope(Constructor, Top, Native, Eval, $this, fn){
  if (Constructor) this.Constructor = !!Constructor;
  if (Top) this.Top = !!Top;
  if (Native) this.Native = !!Native;
  if (Eval) this.Eval = !!Eval;
  if ($this) this.$this = $this;
  if (fn) this.fn = fn;
}

Scope.prototype.inspect = function inspect(){
  var vals = ['Constructor', 'Top', 'Native', 'Eval'].map(function(s){
    return s in this ? ('['+s+']').color('magenta') : '';
  }, this).join('');
  this.$this && vals.push(this.$this);
  this.fn && vals.push(this.fn);
  return vals;
}


Scope.prototype.toString = Scope.prototype.inspect;

