var builtins = require('../lib/builtins');

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
    help: 'Type the name of a built-in module to include it on the current context.',
    defaultTrigger: { type: 'keywords', trigger: builtins.libs },
    action: function(lib){
      return this.context.ctx[lib] = require(lib);
    }
  },
  { name: 'Require',
    help: 'Require for contexts without exposing require to the context.',
    defaultTrigger: { type: 'command', trigger: '.req' },
    action: function(cmd, input){
      var parts = input.split(' ');
      var name = parts.pop();
      var lib = require(name);
      if (parts.length) {
        name = parts.pop();
      } else if (Object(lib) === lib) {
        if (lib.name && lib.name.length) {
          name = lib.name;
        } else if (typeof lib === 'object' && Object.getOwnPropertyNames(lib).length === 1) {
          name = Object.getOwnPropertyNames(lib)[0];
          lib = lib[name];
        }
      }
      return this.context.ctx[name] = lib;
    }
  },
  { name: 'Inspect Context',
    help: 'Shortcut for writing `this` to inspect the current context.',
    defaultTrigger: { type: 'keybind', trigger: 'ctrl+z' },
    action: function(){
      return this.context.view();
    }
  },
  { name: 'Clear Input/Screen',
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
