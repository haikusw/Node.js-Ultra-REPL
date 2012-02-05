function columns(array){
  fill(array[0].length, function(i){ return array[i].map(widest) })
  if (typeof array[0] === 'string') array = [array];
  return array.reduce(f, dense(array[0].length));
}

var slice = Array.prototype.slice;
var ansimatch = /\033\[(?:\d+;)*\d+m/g;

function noop(){}
function id(n){ return n }
function empty(){ return '' }

function space(n){ return repeat(' ', n) }
function repeat(s,n){ return ++n > 0 ? new Array(n).join(s+'') : '' }
function letter(n){ return String.fromCharCode(n + 97) }
function uletter(n){ return String.fromCharCode(n + 65) }
function alength(s){ return s.replace(ansimatch, '').length }
function noansi(s){ return s.replace(ansimatch, '') }

function pluck(p){ return function(o){ return o[p] } }
function constant(n){ return function(){ return n } }
function bracket(n){ return function(i){ return n+'['+i+']' } }


function dense(n){ return n > 0 ? new Array(n).join(0).split(0) : [] }
function widest(a){ return a.reduce(function(r,x){ return Math.max(alength(x+''), r) }, 0) }

function truncate(s,l){
  var r = new RegExp('^.{'+[0,l]+'}\\b','mg'), m, last=0;
  while ((m = r.exec(s)) && r.lastIndex < l) last = r.lastIndex;
  return s.slice(0, last)+'…';
}
function indent(s,n){
  n = n > 0 ? space(n) : n+'';
  return s.split('\n').map(function(x){ return s + x }).join('\n');
}
function pad(s,x){
  var o = space(Math.abs(x) - s.alength);
  return x < 0 ? o + s : s + o;
}

function uletter(n){ return String.fromCharCode(n + 65) }
function eat(s){ return s && s.length ? ','+s : '' }
function scope(f, P, b){ return eval(this+'') }
function fill(n,cb){ var a=[]; while (n--) a[n]=cb(n); return a; }

function pair(o,k){ return [k, o[k]] }





function partial2(f){
  var a = 1 in arguments ? slice.call(arguments, 1) : [];
  return function(){
    return f.apply(this, arguments.length ? a.concat(slice.call(arguments)) : a);
  };
}



function recurry(f,n) {
  n = n || f.length;
  return function () {
    var l = n - arguments.length;
    if (l > -1) {
      var r = curry.apply(this, [f].concat(slice.call(arguments)));
      return l > 0 ? recurry(r,l) : r;
    }
    else {
      return f.apply(this, arguments);
    }
  };
}


function compose(){
  var funcs = slice.call(arguments);
  return function composed(){
    var args = slice.call(arguments);
    var i = funcs.length
    while (0 <= --i) args = [ funcs[i].apply(this, args) ]
    return args[0]
  }
}







function partial(f){
  var _ = arguments;
  var applied = fill(_.length-1, function(i){ return '_['+(i+1)+']' });
  var params = fill(f.length, uletter);

  var code = [ '1 && function '+f.name+'_partial('+params+'){',
               ' switch(arguments.length){',
               '  default: return f.apply(this,['+applied+'].concat([].slice.call(arguments)));']

  for (var i=0; i <= params.length; i++){
    code.push('  case '+i+': return f.call(this'+eat(applied)+eat(params.slice(0, i))+');');
  }
  code.push(' }','}');
  return eval(code.join('\n'));
}

function curry(f){
  var params = fill(f.length, letter);
  var code = [], close=[];
  var spaces = '';
  for (var i=0; i < f.length; i++) {
    close.unshift(spaces+'}\n');
    spaces+=' ';
    code.push('function '+f.name+'_'+(f.length-i-1)+'('+params[i]+'){\n'+spaces);
  }
  code.push('f.apply(this, ['+params+']);');
  return (code.join('return ')+'\n'+close.join(''));
}

function PARAMS(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o){
  return a + b + c + d + e + f + g + h + i + j + k + l + m + n + o + p + q + r + s + t;
}




function pluck(p, o){ return o[p] }

function validVar(name){ return !/$[a-zA-Z_$][\w_$]*$/.test(name) }

function scopable(fn, scope){
  var names = Array.isArray(scope) ? scope : Object.getOwnPropertyNames(scope);
  names = names.filter(validVar);

  var unbound = Function.apply(null, names.concat('"use strict"; return '+fn));

  function bind(scope){
    return unbound.apply(scope, names.map(pluck.bind(null, scope)));
  }

  return Array.isArray(scope) ? bind : bind(scope);
}
