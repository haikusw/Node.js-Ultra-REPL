// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


// This is composed primarily of my improved version of inspect and supporting functions
// currently waiting for acceptance as a pull request https://github.com/joyent/node/pull/2360
// It has to be run separately in each context anyway due to peculiarities with V8's contexts.

_ = (function(){

function inspect(obj, options) {
  var settings = {
    showHidden: options.hiddens,
    maxWidth: options.columns || 60,
    style: options.colors ? color : noColor,
    seen: []
  };

  // cache formatted brackets
  settings.square = [
    settings.style('[', 'Square'),
    settings.style(']', 'Square')
  ];
  settings.curly =  [
    settings.style('{',  'Curly'),
    settings.style('}',  'Curly')
  ];

  return formatValue(obj, options.depth || 2, settings);
}

// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
var ansi = {
  black       : [  '30',    '39'],
  red         : [  '31',    '39'],
  green       : [  '32',    '39'],
  yellow      : [  '33',    '39'],
  blue        : [  '34',    '39'],
  magenta     : [  '35',    '39'],
  cyan        : [  '36',    '39'],
  white       : [  '37',    '39'],
  boldblack   : ['1;30', '22;39'],
  boldred     : ['1;31', '22;39'],
  boldgreen   : ['1;32', '22;39'],
  boldyellow  : ['1;33', '22;39'],
  boldblue    : ['1;34', '22;39'],
  boldmagenta : ['1;35', '22;39'],
  boldcyan    : ['1;36', '22;39'],
  boldwhite   : ['1;37', '22;39']
};


// map types to a color
var styles = {
  // falsey
  Undefined   : 'boldblack',
  Null        : 'boldblack',
  // constructor functions
  Constructor : 'boldyellow',
  // normal types
  Function    : 'boldmagenta',
  Boolean     : 'boldyellow',
  Date        : 'boldred',
  Error       : 'boldred',
  Number      : 'yellow',
  RegExp      : 'boldred',
  // proprty names and strings
  HString     : 'green',
  String      : 'boldgreen',
  HConstant   : 'cyan',
  Constant    : 'boldcyan',
  HName       : 'boldblack',
  Name        : 'boldwhite',
  // meta-labels
  More        : 'red',
  Accessor    : 'magenta',
  Circular    : 'red',
  // brackets
  Square      : 'white',
  Curly       : 'white'
};


// callbind parameterizes `this`
var callbind = Function.prototype.call.bind.bind(Function.prototype.call);
var errorToString = callbind(Error.prototype.toString);

// formatter for functions shared with constructor formatter
function functionLabel(fn, isCtor) {
  var type = isCtor ? 'Constructor' : 'Function',
      label = fn.name ? ': ' + fn.name : '';
  return '[' + type + label + ']';
}


// most formatting determined by internal [[class]]
var formatters = {
  Boolean     : String,
  Constructor : function(f){ return functionLabel(f, true); },
  Date        : callbind(Date.prototype.toString),
  Error       : function(e){ return '[' + errorToString(e) + ']'; },
  Function    : function(f){ return functionLabel(f, false); },
  Null        : String,
  Number      : String,
  RegExp      : callbind(RegExp.prototype.toString),
  String      : quotes,
  Undefined   : String
};


// wrap a string with ansi escapes for coloring
function color(str, style, special) {
  var out = special ? '\u00AB' + str + '\u00BB' : str;
  if (styles[style]) {
    out = '\033[' + ansi[styles[style]][0] + 'm' + out +
          '\033[' + ansi[styles[style]][1] + 'm';
  }
  return out;
}


// return without ansi colors
function noColor(str, style, special) {
  return special ? '\u00AB' + str + '\u00BB' : str;
}


var numeric = /^\d+$/;
var q = ['"', "'"];
var qMatch = [/(')/g, /(")/g];

// quote string preferably with quote type not found in the string
// then escape slashes and opposite quotes if string had both types
function quotes(s) {
  s = String(s).replace(/\\/g, '\\\\');
  var qWith = +(s.match(qMatch[0]) === null);
  return q[qWith] + s.replace(qMatch[1-qWith], '\\$1') + q[qWith];
}


function formatValue(value, depth, settings) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (value && typeof value.inspect === 'function' &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    return value.inspect(depth);
  }

  var base = '';
  var type = isConstructor(value) ? 'Constructor' : getClass(value);
  var array = isArray(value);
  var braces = array ? settings.square : settings.curly;

  if (type in formatters) {
    // types can be formatted by matching their internal class
    base = settings.style(formatters[type](value), type);
  }

  // prevent deeper inspection for primitives and regexps
  if (isPrimitive(value) ||
      !settings.showHidden && type === 'RegExp') {
    return base;
  }

  // depth limit reached
  if (depth < 0) {
    return settings.style('More', 'More', true);
  }

  if (!settings.showHidden) {
    var properties = Object.keys(value);
  } else {
    var properties = Object.getOwnPropertyNames(value);

    if (typeof value === 'function') {
      properties = properties.filter(function(key) {
        // hide useless properties every function has
        return !(key in Function);
      });
      // show prototype last for constructors
      if (type === 'Constructor') {
        properties.push('prototype');
      }
    }
  }

  if (properties.length === 0) {
    // no properties so return '[]' or '{}'
    if (base) {
      return base;
    }
    if (!array || value.length === 0) {
      return braces.join('');
    }
  }

  settings.seen.push(value);

  var output = [];

  // iterate array indexes first
  if (array) {
    for (var i = 0, len = value.length; i < len; i++) {
      if (typeof value[i] === 'undefined') {
        output.push('');
      } else {
        output.push(formatProperty(value, i, depth, settings, array));
      }
    }
  }

  // properties on objects and named array properties
  properties.forEach(function(key) {
    if (!array || !numeric.test(key)) {
      var prop = formatProperty(value, key, depth, settings, array);
      if (prop.length) {
        output.push(prop);
      }
    }
  });

  return combine(output, base, braces, settings.maxWidth);
}

function formatProperty(value, key, depth, settings, array) {
  // str starts as an array, val is a property descriptor
  var str = [];
  var val = Object.getOwnPropertyDescriptor(value, key);

  // V8 c++ accessors like process.env that don't correctly
  // work with Object.getOwnPropertyDescriptor
  if (typeof val === 'undefined') {
    val = {
      value: value[key],
      enumerable: true,
      writable: true
    };
  }

  // check for accessors
  val.get && str.push('Getter');
  val.set && str.push('Setter');

  // combine Getter/Setter, or evaluate to empty for data descriptors
  str = str.join('/');
  if (str) {
    // accessor descriptor
    str = settings.style(str, 'Accessor', true);
  } else {
    // data descriptor
    if (~settings.seen.indexOf(val.value)) {
      // already seen
      if (key !== 'constructor') {
        str = settings.style('Circular', 'Circular', true);
      } else {
        // hide redundent constructor reference
        return '';
      }

    } else {
      // recurse to subproperties
      depth = depth === null ? null : depth - 1;
      str = formatValue(val.value, depth, settings);

      // prepend indentation for multiple lines
      if (~str.indexOf('\n')) {
        str = indent(str);
        // trim the edges
        str = array ? str.substring(2) : '\n' + str;
      }
    }
  }

  // array indexes don't display their name
  if (array && numeric.test(key)) {
    return str;
  }

  var nameFormat;

  if (/^[a-zA-Z_\$][a-zA-Z0-9_\$]*$/.test(key)) {
    // valid JavaScript name not requiring quotes

    if (val.value && !val.writable) {
      // color non-writable differently
      nameFormat = 'Constant';
    } else {
      // regular name
      nameFormat = 'Name';
    }
  } else {
    // name requires quoting
    nameFormat = 'String';
    key = quotes(key);
  }

  if (!val.enumerable) {
    if (settings.style.name !== 'color') {
      // add brackets if colors are disabled
      key = '[' + key + ']';
    } else {
      // use different coloring otherwise
      nameFormat = 'H' + nameFormat;
    }
  }

  return settings.style(key, nameFormat) + ': ' + str;
}

function indent(str){
  return str.split('\n')
            .map(function(line) { return '  ' + line; })
            .join('\n');
}

function combine(output, base, braces, maxWidth) {
  var lines = 0;
  // last line's length
  var length = output.reduce(function(prev, cur) {
    // number of lines
    lines += 1 + !!~cur.indexOf('\n');
    return prev + cur.length + 1;
  }, 0);

  if (base.length) {
    // if given base make it so that it's not too long
    if (length > maxWidth) {
      base = ' ' + base;
      output.unshift(lines > 1 ? '' : ' ');
    } else {
      base = ' ' + base + ' ';
    }
  } else {
    base = ' ';
  }

  // combine lines with commas and pad as needed
  base += output.join(',' + (length > maxWidth ? '\n ' : '') + ' ') + ' ';

  // wrap in appropriate braces
  return braces[0] + base + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar) ||
         (typeof ar === 'object' && objectToString(ar) === '[object Array]');
}

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

// slice '[object Class]' to 'Class' for use in dict lookups
function getClass(o) {
  return objectToString(o).slice(8, -1);
}


// returns true for strings, numbers, booleans, null, undefined, NaN
function isPrimitive(o) {
  return Object(o) !== o;
}


// returns true if a function has properties besides `constructor` in its prototype
// and gracefully handles any input including undefined and undefined prototypes
function isConstructor(o){
  return typeof o === 'function' &&
         Object(o.prototype) === o.prototype &&
         Object.getOwnPropertyNames(o.prototype).length >
         ('constructor' in o.prototype);
}




function filter(obj, arr){
  return Object.getOwnPropertyNames(obj).reduce(function(ret, name){
    if (!~arr.indexOf(name)) {
      Object.defineProperty(ret, name, Object.getOwnPropertyDescriptor(obj, name));
    }
    return ret;
  },{});
}

return {
  inspect: inspect,
  filter: filter
};

})();