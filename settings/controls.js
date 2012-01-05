module.exports = {
  'Command List'        : key('f1'),
  'Next Page'           : key('pgdn'),
  'Previous Page'       : key('pgup'),
  'Clear Input/Screen'  : key('esc'),
  'Clear Screen'        : key('esc esc'),
  'Exit'                : key('esc esc esc'),
  'Inspect Context'     : key('ctrl+z'),

  'Toggle Hiddens'      : key('f2'),
  'Toggle Builtins'     : key('f3'),
  'Toggle __proto__'    : key('f4'),
  'Inspect Depth++'     : key('f5'),
  'Inspect Depth--'     : key('f6'),
  'Set Inspect Depth'   : dot('depth'),
  'Toggle Colors'       : key('f10'),

  'Require'             : dot('req'),
  'Load REPL Module'    : dot('mod'),

  'Delete Right'        : key('del'),
  'Delete Left'         : key('bksp'),
  'Delete Word Right'   : key('ctrl+del'),
  'Delete Word Left'    : key('ctrl+bksp'),
  'Delete Line Right'   : key('ctrl+shift+del'),
  'Delete Line Left'    : key('ctrl+shift+bksp'),

  'Move Left'           : key('left'),
  'Move Right'          : key('right'),
  'Word Left'           : key('ctrl+left'),
  'Word Right'          : key('ctrl+right'),
  'Line Left'           : key('home'),
  'Line Right'          : key('end'),

  'History Prev'        : key('up'),
  'History Next'        : key('down'),

  'Line'                : key('enter'),
  //'Tab Complete'        : key('tab'),

  // Context Controls
  'Inject Node Builtins': key('alt+a'),
  'Create Context'      : key('ctrl+shift+up'),
  'Delete Context'      : key('ctrl+shift+down'),
  'Reset Context'       : dot('reset'),
  'Next Context'        : key('ctrl+up'),
  'Previous Context'    : key('ctrl+down'),
  'Label Context'       : dot('label'),

  // REPL Development
  'Inject REPL'         : key('f12'),
  'Toggle Key Display'  : key('f11'),
  'Color Test'          : key('f10'),
};

function keyword(x){ return { type: 'keyword', trigger: x } }
function dot(x){ return { type: 'command', trigger: '.' + x } }
function key(x){ return { type: 'keybind', trigger: x } }