var path = require('path');
var style = require('../settings/styling');

module.exports = [
  {
    name: 'Stack Trace',
    help: 'View the live stack.',
    defaultTrigger: { type: 'keybind', trigger: 'alt+s' },
    action: function(){
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
  for(var p in stack[0]) {
    stack[p] = stack[0][p]
  }
  stack.find = function(fn) {
    console.log(stack)
    for(var i=0;i<stack.length;i++) {
      if(stack[i].getFunction() === fn) {
        return i
      }
    }
    return -1
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


function trace(_, i){
  var n = (' #'+(i+1)).color('bblack');
  var loc = new Location(_.getLineNumber(),
                         _.getColumnNumber(),
                         _.getPosition(),
                         _.getFileName(),
                         _.getEvalOrigin()).inspect();

 var scope = new Scope(_.isConstructor(),
                       _.isToplevel(),
                       _.isNative(),
                       _.isEval(),
                       _.getThis(),
                       _.getFunction()).inspect();

   
 var origin = new Origin(_.getFunctionName(),
                         _.getMethodName(),
                         _.getTypeName()).inspect();

  return [
    [pad(n,5), pad(loc.origin + space(1) +loc.fileName, 60),  pad(loc.line, -10) ],
    [space(5), space(60),                            pad(loc.column, -10) ],
    [space(5), pad(origin.callas+space(1)+origin.callby, 60),pad(loc.position, -10) ],
    [scope.scopes]
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
  return {
    callby: out[1],
    callas: out[0],
    type: this.type,
    function: this.fn,
    ancestor: this.ancestor,
  }
}
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
    this.file = path.relative(path.resolve(__filename, '..', 'core'), file);
    this.type = 'user';
  }
  this.name = path.basename(file);
  if (evalsite !== file) this.evalsite = evalsite;
}

Location.prototype.inspect = function inspect(){
  var d = {
    names: ['Line', 'Col', 'Pos'],
    trace: [this.line,  this.column, this.position],
    colors: { node: 'yellow', js: 'cyan', user: 'green' },

  }
  var typeColor = d.colors[this.type];
  var type = ('['+this.type+']').color('b'+typeColor);
  var file = this.file.color(typeColor);
  d.trace = d.trace.map(function(s){ return (''+s).pad(10).color('white') })
  d.names = d.names.map(function(s){ return s.color('bblack').pad(-5) })
   
  return { origin: type,
           filePath: file,
           fileName: this.name.color(typeColor),
           line:     d.names[0] + space(1) + d.trace[0],
           column:   d.names[1] + space(1) + d.trace[1],
           position: d.names[2] + space(1) + d.trace[2] };
};

Location.prototype.toString = Location.prototype.inspect;

function Scope(){
  for (var k in arguments) {
    this[Scope.args[k]] = arguments[k];
  }
}

Scope.args = ['Constructor', 'Top', 'Native', 'Eval', '$this', 'fn'];

Scope.prototype.inspect = function inspect(){
  var out = {
    scopes: []
  }
  for (var k in arguments) {
    if (this[Scope.args[k]]) {
      if (k < 4) {
        out.scope.push(this[Scope.args[k]].color('magenta'));
      } else {
        out[Scope.args[k]] = this[Scope.args[k]];
      }
    }
  }
  return out;
}


Scope.prototype.toString = Scope.prototype.inspect;

