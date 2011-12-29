function chunk(source, split, bounds){
  if (Array.isArray(source)) {
    source = source.join(split);
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
  return result;
}

function indent(source, indent){
  if (!Array.isArray(source)) {
    source = source.split('\n');
  }
  if (indent > 0) {
    indent = repeat(' ', indent);
  }
  return source.map(function(s){ return indent + s }).join('\n');
}

function repeat(str, amount){
  return Array(++amount).join(str);
}

function margins(width, str){
  width -= ansilength(str) - 1;
  return str + Array(width > 0 ? width : 0).join(' ');
}

function ansilength(str){
  return str.replace(/\033\[(?:[12]2?;)?3\dm/g, '').length;
}

function descriptor(val, h, r){
  var d = { configurable: true, enumerable: true, writable: true };
  if (h === true) {      d.enumerable = false;
    if (r === true)      d.readonly = false;
  } else if (r === true) d.readonly = false;
  d.value = val;
  return d;
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
	name || (name = 'bwhite');
	if (name in types) {
		name = types[name];
	}
  name in colors || (name = 'bwhite');
  return colors[name][0] + str + colors[name][1];
}


//['◊', '□', '●', '♯', 'ⵂ', 'ⵗ', 'ⵘ', 'ⴾ', 'ⵈ', 'ⵆ',
// 'ⴽ', 'ⴿ', 'ⴱ', 'ⴲ', 'ⵀ', '•',
// '–', '—', '«', '»', '‹', '›', 'Δ']


module.exports = {
	ansilength: ansilength,
	descriptor: descriptor,
	margins: margins,
	color: color,
  repeat: repeat,
  indent: indent,
  chunk: chunk,
  maxLength: maxLength
}