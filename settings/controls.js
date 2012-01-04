module.exports = {
  'Command List'        : key('f1'),
  'Next Page'           : key('pgdn'),
  'Previous Page'       : key('pgup'),
  'Clear Input/Screen'  : key('esc'),
  'Clear Screen'        : key('esc esc'),
  'Exit'                : key('esc esc esc'),

  'Toggle Hiddens'      : key('f2'),
  'Toggle Builtins'     : key('f3'),
  'Toggle __proto__'    : key('f4'),
  'Inspect Depth++'     : key('f5'),
  'Inspect Depth--'     : key('f6'),
  'Set Inspect Depth'   : dot('depth'),
  'Toggle Colors'       : key('f10'),

  'Create Context'      : ctrl_shift('up'),
  'Delete Context'      : ctrl_shift('down'),
  'Next Context'        : ctrl('up'),
  'Previous Context'    : ctrl('down'),
  'Reset Context'       : ctrl('r'),
  'Label Context'       : dot('label'),

  'Inject REPL'         : key('f11'),
  'Toggle Key Display'  : key('f12'),
  'Require'             : dot('req'),
  'Load REPL Module'    : dot('mod'),

  'Color Test'          : key('alt+1 alt+2'),

  //'Save Session'      : dot('save'),







  'Delete Right'        : key('del'),
  'Delete Left'         : key('bksp'),
  'Delete Word Right'   : ctrl('del'),
  'Delete Word Left'    : ctrl('bksp'),
  'Delete Line Right'   : ctrl_shift('del'),
  'Delete Line Left'    : ctrl_shift('bksp'),

  'Move Left'           : key('left'),
  'Move Right'          : key('right'),
  'Word Left'           : ctrl('left'),
  'Word Right'          : ctrl('right'),
  'Line Left'           : key('home'),
  'Line Right'          : key('end'),

  'History Prev'        : key('up'),
  'History Next'        : key('down'),

  'Line'                : key('enter'),
  //'Tab Complete'        : key('tab'),
};



// ctrl = command on mac
// alt = meta on linux

function keyword         (x){ return { type: 'keyword', trigger: x } }
function dot             (x){ return { type: 'command', trigger: '.' + x } }
function key             (x){ return { type: 'keybind', trigger: x } }
function ctrl            (x){ return key('ctrl+' + x) }
function alt             (x){ return key('alt+' + x) }
function shift           (x){ return key('shift+' + x) }
function ctrl_alt        (x){ return ctrl('alt+' + x) }
function ctrl_shift      (x){ return ctrl('shift+' + x) }
function ctrl_alt_shift  (x){ return ctrl_alt('shift+' + x) }
function alt_shift       (x){ return alt('shift+' + x) }