var __ = require('./object-utils').descriptor;

function chunk(split, bounds, indent, source){
  if (Array.isArray(source)) {
    source = source.join(split);
  } else if (typeof this === 'string') {
    source = this;
  }
  source += split;
  bounds = Array.isArray(bounds) ? bounds : [bounds - 10, bounds]

  var regex = new RegExp('.{'+bounds+'}'+split, 'g');
  var result = [];
  var match;

  while (match = regex.exec(source)) {
    result.push(match[0].slice(split.length));
    regex.lastIndex -= split.length;
  }
  result[0] = source.slice(0, split.length) + result[0];
  result.push(result.pop().slice(0, -split.length));
  if (indent > 0) {
    indent = space(indent);
    return result.map(function(s){ return indent + s }).join('\n');
  }
  return result;
}

var ansimatch = /\033\[(?:\d+;)*\d+m/g;

function ansilength(str){
  return str.replace(ansimatch, '').length;
}

function widest(arr, field){
  return arr.reduce(function(a, b){
    if (field) b = b[field];
    if (typeof b !== 'string') return a;
    b = b.alength;
    return a > b ? a : b;
  }, 0);
}

var names = color.names = [ 'black',   'red',      'green',  'yellow',
                            'blue',    'magenta',  'cyan',   'white',
                            'bblack',  'bred',     'bgreen', 'byellow',
                            'bblue',   'bmagenta', 'bcyan',  'bwhite', ];

var colors = color.colors = {};

for (var i = 16; i-- > 0;) {
  colors[names[i]] = ['\033['+(i > 7 ? '1;':'')+(i%8+30)+'m',
                      '\033['+(i > 7 ?'21;':'')+'39m']
}
for (var i = 0; i++ < 8;) {
  names.push('bg'+names[i]);
  colors['bg'+names[i]] = ['\033['+(i+40)+'m', '\033[49m']
}
for (var i = 0; i++ < 8;) {
  names.push('bg'+names[i+8]);
  colors['bg'+names[i+8]] = ['\033['+(i+100)+'m', '\033[25;49m']
}

colors.reverse = ['\033[7m', '\033[27m'];
colors.underline = ['\033[4m', '\033[24m'];

function scolor(str, name) {
  var noColor = color.context && !color.context.colors
  if (Array.isArray(str)) {
    if (name) {
      if (noColor) return str;
      return str.map(function(s){ return color(s, name) });
    } else {
      name = str[1];
      str = str[0];
    }
  }
  if (noColor) return str;
  name && name in colors || (name = 'bwhite');
  return colors[name][0] + str + colors[name][1];
}


color.context = { colors: process.stdout._type === 'tty' };

function color(name){
  if (!color.context.colors && typeof this === 'string') return this+'';
  if (Array.isArray(name)) {
    var text = this;
    name.forEach(function(col){
      col = col || 'white';
      text = colors[col][0] + text + colors[col][1];
    });
    return text+'';
  }
  name && name in colors || (name = 'bwhite');
  if (color.context && color.context.colors) {
    return colors[name][0] + this + colors[name][1]+'';
  }
  return this+'';
}


module.exports = {
  ansilength: ansilength,
  color: scolor,
  chunk: chunk,
  widest: widest,
  attachTo: function attachTo(obj){
    methods.forEach(function(method){
      Object.defineProperty(obj, method.name, { value: method, writable: true, configurable: true });
    });
    Object.defineProperty(obj, 'alength', {
      configurable: true,
      get: function(){ return this.replace(ansimatch, '').length }
    });
  }
};


var methods = [
  function stripAnsi(){
    return this.replace(ansimatch, '');
  },
  function pad(x){
    var out = space(Math.abs(x) - this.alength);
    return x < 0 ? out + this : this + out;
  },
  function repeat(x){
    return Array(++x > 0 ? x : 0).join(this);
  },
  function indent(x){
    x = space(x);
    return this.split('\n').map(function(s){ return x + s }).join('\n');
  },
  function align(breakAt, indent){
    if (this.alength < breakAt) return this;
    return this.chunk(' ', breakAt, indent).trim();
  },
  chunk,
  color
];


var slice = Array.prototype.slice;

var ansimatch = /\033\[(?:\d+;)*\d+m/g;

function alength(s){ return s.replace(ansimatch, '').length }
function noansi(s){ return s.replace(ansimatch, '') }
function dense(n){ return n > 0 ? new Array(n).join(0).split(0) : [] }
function space(n){ return repeat(' ', n) }
function repeat(s,n){ return ++n > 0 ? new Array(n).join(s+'') : '' }
function fill(n,cb){ var a=[]; while (n--) a[n]=cb(n); return a; }
function widest(a){ return a.reduce(function(r,x){ return Math.max(alength(x+''), r) }, 0) }
function truncate(s,l){
  var r = new RegExp('^.{'+[0,l]+'}\\b','mg'), m, last=0;
  while ((m = r.exec(s)) && r.lastIndex < l) last = r.lastIndex;
  return s.slice(0, last)+'â€¦';
}
function indent(s,n){
  n = n > 0 ? space(n) : n+'';
  return s.split('\n').map(function(x){ return s + x }).join('\n');
}


function columns(array){
  fill(array[0].length, function(i){ return array[i].map(widest) })
  if (typeof array[0] === 'string') array = [array];
  return array.reduce(f, dense(array[0].length));
}
