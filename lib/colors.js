
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

module.exports = color


//['◊', '□', '●', '♯', 'ⵂ', 'ⵗ', 'ⵘ', 'ⴾ', 'ⵈ', 'ⵆ', 'ⴽ', 'ⴿ', 'ⴱ', 'ⴲ', 'ⵀ', '•', '–', '—', '«', '»', '‹', '›', 'Δ']