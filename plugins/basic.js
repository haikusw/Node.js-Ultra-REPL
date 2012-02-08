var builtins = require('../data/builtins');
var Results = require('../lib/Results');

module.exports = [
  { name: 'Command List',
    help: 'Shows this list.',
    defaultTrigger: { type: 'keybind', trigger: 'f1' },
    action: call('showHelp')
  },
  { name: 'Load Plugin',
    help: 'Dynamically load an UltraREPL plugin.',
    defaultTrigger: { type: 'command', trigger: '.plugin' },
    action: function(cmd, name){
      this.showHelp(this.commands.loadPlugin(name));
    }
  },
  { name: 'Auto-Includer',
    help: 'Type "/<lib>" to include built-in <lib> on the current context.',
    defaultTrigger: { type: 'keywords', trigger: builtins.libs.map(function(lib){ return '/'+lib }) },
    action: function(lib){
      lib = lib.slice(1);
      var result = this.context.ctx[lib] = require(lib);
      return new Results.Success(this.context.current, null, result, null, 'Built-in Lib "'+lib+'"');
    }
  },
  { name: 'Inspect Context',
    help: 'Shortcut for writing `this` to inspect the current context.',
    defaultTrigger: { type: 'keybind', trigger: 'ctrl+z' },
    action: function(){
      return this.context.view();
    }
  },
  { name: 'Clear Input',
    help: 'Clear the the input line if it has text or clears the screen if not.',
    defaultTrigger: { type: 'keybind', trigger: 'esc' },
    action: function(){
      this.rli.line.trim().length ? this.resetInput() : this.resetScreen();
    }
  },
  { name: 'Clear Screen',
    help: 'Clear the screen.',
    defaultTrigger: { type: 'keybind', trigger: 'esc esc' },
    action: call('resetScreen')
  },
  { name: 'Exit',
    help: 'Exit the REPL.',
    defaultTrigger: { type: 'keybind', trigger: 'esc esc esc' },
    action: function(){
      this.rli.close();
      process.exit();
    }
  }
];

function call(section, prop, args){
  if (typeof args === 'undefined') {
    args = [];
  } else if (!Array.isArray(args)) {
    args = [args];
  }
  return function(){
    if (prop) {
      return this[section][prop].apply(this[section], args)
    } else {
      return this[section].apply(this, args);
    }
  }
}
