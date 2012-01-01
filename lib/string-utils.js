var __ = require('./object-utils').descriptor;

function chunk(split, bounds, indent, source){
  if (Array.isArray(source)) {
    source = source.join(split);
  } else if (typeof this === 'string') {
    source = this;
  }
  source += split;

  bounds = Array.isArray(bounds) ? bounds : [bounds - 10, bounds]

  var result = [], match, regex = RegExp('.{'+bounds+'}'+split, 'g');

  while (match = regex.exec(source)) {
    result.push(match[0].slice(split.length));
    regex.lastIndex -= split.length;
  }
  result[0] = source.slice(0, split.length) + result[0];
  result.push(result.pop().slice(0, -split.length));
  if (indent > 0) {
    indent = ' '.repeat(indent);
    return result.map(function(s){ return indent + s }).join('\n');
  }
  return result;
}


function ansilength(str){
  return str.replace(/\033\[(?:[12]2?;)?3\dm/g, '').length;
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
                      '\033['+(i > 7 ?'22;':'')+'39m']
}
for (var i = 16; i-- > 0;) {
  colors['bg'+names[i]] = ['\033['+(i > 7 ? '1;':'')+(i%8+40)+'m',
                           '\033['+(i > 7 ?'22;':'')+'49m']
}

function color(str, name) {
  var noColor = scolor.context && !scolor.context.colors
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

function scolor(name){
  name = name || 'bwhite';
  if (scolor.context && scolor.context.colors) {
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
  widest: widest,
  attachTo: function attachTo(obj){
    Object.defineProperties(obj, {
      alength: __(function getter(){
        return this.replace(/\033\[(?:[12]2?;)?3\dm/g, '').length;
      }, true),
      pad: __(function pad(w){
        return this + ' '.repeat(w - this.alength);
      }, true),
      repeat: __(function repeat(w){
        return Array(++w > 0 ? w : 0).join(this);
      }, true),
      indent: __(function indent(w){
        w = ' '.repeat(w);
        return this.split('\n').map(function(s){ return w + s }).join('\n');
      }, true),
      align: __(function align(breakAt, indent){
        if (this.alength < breakAt) return this;
        return this.chunk(' ', breakAt, indent).trim();
      }),
      chunk: __(chunk),
      color: __(scolor, true),
    })
  }
};