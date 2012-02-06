var builtins = require('../lib/builtins');
var Results = require('../core/Results');

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
  { name: 'Set/View Local',
    help: 'View the current or set a new object which is local scoped for executed code.',
    defaultTrigger: { type: 'match', trigger: /^locals\.?([a-zA-Z_\$][a-zA-Z0-9_\$]*)?(?:\s*=\s*(.*))?$/ },
    action: function(cmd, match){
      if (match[1]) {
        var result = this.context.run('(function(){return '+match[1]+'\n})()');
        if (result.status === 'Success') {
          if (match[0]) {
            this.context.local[match[0]] = result.completion;
            result.label = 'Locals.'+match[0];
          } else {
            this.context.local = result.completion;
            result.label = 'Locals';
          }
          return result;
        } 
      } else if (match[0]) {
        var result = this.context.local[match[0]];
        var label = 'Locals.'+match[0];
      } else {
        var result = this.context.local;
        var label = 'Locals';
      }
      return new Results.Success(this.context.current, null, result, null, label);
    }
  },
  { name: 'Require',
    help: 'Require for contexts without exposing require to the context.',
    defaultTrigger: { type: 'command', trigger: '.r' },
    action: function(cmd, input){
      var parts = input.split(' ');
      var name = parts.pop();
      try {var lib = require(name) } catch (e) { return e }
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
      return new Results.Success(this.context.current, null, this.context.ctx[name] = lib, null, 'Required lib "'+name+'"');
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
