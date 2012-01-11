module.exports = function(keyword, command, keybind){
  return {
    'Command List'        : keybind('f1'),
    'Next Page'           : keybind('pgdn'),
    'Previous Page'       : keybind('pgup'),
    'Clear Input/Screen'  : keybind('esc'),
    'Clear Screen'        : keybind('esc esc'),
    'Exit'                : keybind('esc esc esc'),
    'Inspect Context'     : keybind('ctrl+z'),

    'Require'             : command('.req'),
    'Load REPL Module'    : command('.mod'),

    'Delete Right'        : keybind('del'),
    'Delete Left'         : keybind('bksp'),
    'Delete Word Right'   : keybind('ctrl+del'),
    'Delete Word Left'    : keybind('ctrl+bksp'),
    'Delete Line Right'   : keybind('ctrl+shift+del'),
    'Delete Line Left'    : keybind('ctrl+shift+bksp'),

    'Move Left'           : keybind('left'),
    'Move Right'          : keybind('right'),
    'Word Left'           : keybind('ctrl+left'),
    'Word Right'          : keybind('ctrl+right'),
    'Line Left'           : keybind('home'),
    'Line Right'          : keybind('end'),

    'History Prev'        : keybind('up'),
    'History Next'        : keybind('down'),

    'Line'                : keybind('enter'),
    //'Tab Complete'        : keybind('tab'),

    // Toggles
    'Toggle Hiddens'      : keybind('f2'),
    'Toggle Builtins'     : keybind('f3'),
    'Toggle __proto__'    : keybind('f4'),
    'Inspect Depth--'     : keybind('f5'),
    'Inspect Depth++'     : keybind('f6'),
    'Toggle Colors'       : keybind('f9'),
    'Set Inspect Depth'   : command('.depth'),

    // Context Controls
    'Inject Node Builtins': keybind('alt+a'),
    'Create Context'      : keybind('ctrl+shift+up'),
    'Delete Context'      : keybind('ctrl+shift+down'),
    'Reset Context'       : command('.reset'),
    'Next Context'        : keybind('ctrl+up'),
    'Previous Context'    : keybind('ctrl+down'),
    'Label Context'       : command('.label'),

    // REPL Development
    'Inject REPL'         : keybind('f12'),
    'Toggle Key Display'  : keybind('f11'),
    'Color Test'          : keybind('f10'),
  };
}