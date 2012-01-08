var builtins = require('../lib/builtins');


module.exports = [
  { name: 'Command List',
    help: 'Shows this list.',
    defaultTrigger: { type: 'keybind', trigger: 'f1' },
    action: call('showHelp')
  },
  { name: 'Load REPL Module',
    help: 'Dynamically load a module made to integrate with UltraREPL.',
    defaultTrigger: { type: 'command', trigger: '.mod' },
    action: function(cmd, name){
      var help = this.loadModule(name);
      this.showHelp(help);
      return true;
    }
  },
  { name: 'Auto-Includer',
    help: 'Type the name of a built-in module to include it on the current context.',
    type: 'keywords',
    defaultTrigger: builtins.libs,
    action: function(lib){
      return require(lib);
    }
  },
  { name: 'Require',
    help: 'Require for contexts without exposing require to the context. Two parameters: .f propName libName. .f functionAsLib -> functionAsLib.name. Object -> properties copied.',
    defaultTrigger: { type: 'command', trigger: '.req' },
    action: function(cmd, input){
      var parts = input.split(' ');
      var name = parts[0];

      if (parts.length === 2) {
        var lib = this.context.ctx[name] = require(parts[1]);
      } else {
        var lib = require(parts[0]);
        if (typeof lib === 'function' && lib.name.length) {
          this.context.ctx[lib.name] = lib;
        } else if (Object.prototype.toString.call(lib) === '[object Object]') {
          Object.keys(lib).forEach(function(name){
            this.context.ctx[name] = lib[name];
          }, this);
        } else {
          this.context.ctx[name] = lib;
        }
      }
      return lib;
    }
  },
  { name: 'Inspect Context',
    help: 'Shortcut for writing `this` to inspect the current context.',
    defaultTrigger: { type: 'keybind', trigger: 'ctrl+z' },
    action: function(){
      this.context.ctx._ = this.context.ctx;
      this.inspector();
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
    help: 'Exit the REPL.\n',
    defaultTrigger: { type: 'keybind', trigger: 'esc esc esc' },
    action: function(){ this.rli.close() }
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
