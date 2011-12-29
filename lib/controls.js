module.exports = {
  'Command List'      : alt('q'),
  'Next Context'      : ctrl('up'),
  'Previous Context'  : ctrl('down'),
  'Create Context'    : ctrl_shift('up'),
  'Delete Context'    : ctrl_shift('down'),
  'Reset Context'     : ctrl('r'),
  'Label Context'     : command('label'),
  'Toggle Builtins'   : command('builtins'),
  'Toggle Colors'     : command('colors'),
  'Toggle Hiddens'    : command('hiddens'),
  'Inspect Depth'     : command('depth'),
  'Clear'             : command('clear'),
  'Exit'             : ctrl('x'),
  'Save Session'      : command('save'),
  'Inject REPL'       : command('repl'),
};

// ctrl = command : mac
// alt = meta     : linux

function keyword         (x){ return { type: 'keyword', activation: x } }
function command         (x){ return { type: 'command', activation: '.' + x } }
function key             (x){ return { type: 'keybind', activation: x } }
function ctrl            (x){ return key('ctrl+' + x) }
function alt             (x){ return key('alt+' + x) }
function shift           (x){ return key('shift+' + x) }
function ctrl_alt        (x){ return ctrl('alt+' + x) }
function ctrl_shift      (x){ return ctrl('shift+' + x) }
function ctrl_alt_shift  (x){ return ctrl_alt('shift+' + x) }
function alt_shift       (x){ return alt('shift+' + x) }