var __ = require('./object-utils').descriptor;
var _get = require('./object-utils').accessor;

function chunk(split, bounds, indent, arr){
  if (arr) {
    var source = arr.join(split);
  } else {
    var source = this;
  }
  if (!Array.isArray(bounds)) {
    bounds = [bounds - 10, bounds];
  }
  source += split;
  var regex = RegExp('.{'+bounds+'}'+split, 'g');
  var result = [];
  var match;
  while (match = regex.exec(source)) {
    match = match[0].slice(split.length);
    result.push(match);
    regex.lastIndex -= split.length;
  }
  result[0] = source.slice(0, split.length) + result[0];
  result.push(result.pop().slice(0, -split.length));
  if (indent) {
    if (indent > 1) {
      indent = ' '.repeat(indent);
    }
    return result.map(function(s){ return indent + s }).join('\n');
  } else {
    return result;
  }
}


function ansilength(str){
  return str.replace(/\033\[(?:[12]2?;)?3\dm/g, '').length;
}

function maxLength(arr, field){
  return arr.reduce(function(a, b){
    if (field) b = b[field];
    if (typeof b !== 'string') return a;
    b = ansilength(b);
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
                      '\033['+(i > 7 ?'22;':'')+'39m']
}


var types = color.types = {
  // falsey
  Undefined   : 'bblack',
  Null        : 'bblack',
  // constructor functions
  Constructor : 'byellow',
  // normal types
  Function    : 'bmagenta',
  Boolean     : 'byellow',
  Date        : 'bred',
  Error       : 'bred',
  Number      : 'yellow',
  RegExp      : 'bred',
  // proprty names and strings
  HString     : 'green',
  String      : 'bgreen',
  HConstant   : 'cyan',
  Constant    : 'bcyan',
  HName       : 'bblack',
  Name        : 'bwhite',
  // meta-labels
  More        : 'red',
  Accessor    : 'magenta',
  Circular    : 'red',
  // brackets
  Square      : 'white',
  Curly       : 'white'
};

function color(str, name) {
  var noColor = String.prototype.color.context.settings && !String.prototype.color.context.settings.colors
   // this.settings && !this.settings.colors;
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
	name || (name = 'bwhite');
	if (name in types) {
		name = types[name];
	}
  name in colors || (name = 'bwhite');
  return colors[name][0] + str + colors[name][1];
}

function scolor(name){
  name = name || 'bwhite';
  if (scolor.context && scolor.context.settings && scolor.context.settings.colors) {
    return colors[name][0] + this + colors[name][1];
  }
  return this;
}

//['◊', '□', '●', '♯', 'ⵂ', 'ⵗ', 'ⵘ', 'ⴾ', 'ⵈ', 'ⵆ',
// 'ⴽ', 'ⴿ', 'ⴱ', 'ⴲ', 'ⵀ', '•',
// '–', '—', '«', '»', '‹', '›', 'Δ']


module.exports = {
	ansilength: ansilength,
	color: color,
  chunk: chunk,
  maxLength: maxLength,
  attachTo: function attachTo(obj){
    Object.defineProperties(obj, {
      alength: _get(function(){
        return this.replace(/\033\[(?:[12]2?;)?3\dm/g, '').length;
      }, true),
      margin: __(function margin(width){
        return this + ' '.repeat(width - this.alength);
      }, true),
      repeat: __(function repeat(amount){
        return Array(++amount > 0 ? amount : 0).join(this);
      }, true),
      indent: __(function indent(amount){
        amount = ' '.repeat(amount);
        return this.split('\n').map(function(s){ return amount + s }).join('\n');
      }, true),
      chunk: __(chunk),
      color: __(scolor, true),
    })
  }
};