module.exports = {
  'Command List'      : key('f1'),

  'Create Context'    : ctrl_shift('up'),
  'Delete Context'    : ctrl_shift('down'),
  'Next Context'      : ctrl('up'),
  'Previous Context'  : ctrl('down'),
  'Reset Context'     : ctrl('r'),
  'Label Context'     : dot('label'),

  'Next Page'         : key('pgdn'),
  'Previous Page'     : key('pgup'),

  'Toggle Hiddens'    : key('f2'),
  'Toggle Builtins'   : key('f3'),
  'Inspect Depth--'   : key('f6'),
  'Inspect Depth++'   : key('f5'),
  'Set Inspect Depth' : dot('depth'),
  'Toggle Colors'     : key('f10'),

  'Inject REPL'       : key('f11'),
  'Toggle Key Display': key('f12'),

  'Require'           : dot('r'),

  'Clear Input/Screen': key('esc'),
  'Clear Screen'      : key('esc esc'),
  'Exit'              : key('esc esc esc'),

  'Save Session'      : dot('save'),
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