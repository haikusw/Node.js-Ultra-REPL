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
function letter(n){ return String.fromCharCode(n + 97) }
function uletter(n){ return String.fromCharCode(n + 65) }
function alength(s){ return s.replace(ansimatch, '').length }
function noansi(s){ return s.replace(ansimatch, '') }

function pluck(p){ return function(o){ return o[p] } }
function constant(n){ return function(){ return n } }
function bracket(n){ return function(i){ return n+'['+i+']' } }


function dense(n){ return n > 0 ? new Array(n).join(0).split(0) : [] }
function repeat(s,n){ return ++n > 0 ? new Array(n).join(s+'') : '' }
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
function curry(f,b){
  var a = slice.call(arguments, 2);
  var curried = fill(a.length, function(i){ return 'P['+i+']' });
  var params = fill(f.length - a.length, uletter);
  var code = [ '1&&function '+f.name+'_('+params+'){', ' switch(arguments.length){',
               '/* b='+b.name+', P='+a+'*/',
               '  default: return f.apply(b'+',P.concat(slice.call(arguments)))',
               '  case 0: return f.call(b'+eat(curried)+')' ];
  for (var i=1; i <= params.length; i++){
    code.push('  case '+i+': return f.call(b'+eat(curried)+eat(params.slice(0, i))+')');
  }
  code.push(' }','}');
  code = code.join('\n');
  return scope.call(code, f, a, b);
}



function curry2(f){
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

var currythis = curry(curry, scope);
