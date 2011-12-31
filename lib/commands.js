var util = require('util');
var fs = require('fs');

var controls = require('../settings/controls');
var style = require('../settings/styling');

var commands = {
  'Command List': {
    help: 'Shows this list.',
    action: call('showHelp')
  },

  'Create Context': {
    help: 'Create, initialize, and switch into a new V8 context.',
    action: call('context', 'create')
  },
  'Delete Context': {
    help: 'Delete the current V8 context and all objects unreferences externally.',
    action: call('context', 'remove')
  },
  'Next Context': {
    help: 'Switch to the previous next.',
    action: call('context', 'change', 1)
  },
  'Previous Context': {
    help: 'Switch to the previous context.',
    action: call('context', 'change', -1)
  },
  'Reset Context': {
    help: 'Reset current context.',
    action: call('context', 'reset')
  },
  'Label Context': {
    help: 'Change the label of the current context.',
    action: function(name){
      this.context.name = name;
      this.displayPrompt();
    }
  },


  'Toggle Builtins': {
    help: 'Toggle whether default built-in objects are shown.',
    action: toggle('context', 'builtins')
  },
  'Toggle Colors': {
    help: 'Toggle whether output is colored.',
    action: toggle('context', 'colors')
  },
  'Toggle Hiddens': {
    help: 'Toggle whether hidden properties are shown.',
    action: toggle('context', 'hiddens')
  },

  'Inspector Depth': {
    help: 'Set or view maximum depth to inspect.',
    action: function(depth){
       if (depth > 0 || depth === '0') {
        this.context.depth = parseInt(depth);
       }
       this.resetInput();
       this.timedPrompt('depth is ' + this.context.depth, style.prompt.toggleOn);
     }
   },

  'Clear Input': {
    help: 'Clear the screen.',
    action: function(){ this.rli.line.trim().length ? this.resetInput() : this.resetScreen() } },
  'Clear Screen': {
    help: 'Clear the screen.',
    action: function(){ this.resetScreen() } },
  'Exit': {
    help: 'Exit the REPL.',
    action: function(){ this.rli.close() } },

  // 'Save Session': {
  //   help:        'Save all evaluated commands in this REPL session to a file.',
  //   action: function(file) {
  //    try {
  //      fs.writeFileSync(file, this.lines.join('\n'));
  //      this.write('Session saved to:' + file + '\n');
  //    } catch (e) {
  //      this.write('Failed to save:' + file)
  //    }
  //    this.displayPrompt();
  //   }
  // },

  'Inject REPL': {
    help: 'Adds a reference to the live repl object to the current context.',
    action: function(){
      this.context.ctx.repl = this;
      this.context._ = this;
      this.inspector();
    }
  },

  'Require': {
    help: 'Require for contexts without exposing require to the context. If passed two parameters the first is used to name it globally. If exports it a named function its name will be used. If an object its properties will be copied globally.',
    action: function(cmd, input){
      var parts = input.split(' ');
      var name = parts[0];

      if (parts.length === 2) {
        var lib = this.context[name] = require(parts[1]);
      } else {
        var lib = require(parts[0]);
        if (typeof lib === 'function' && lib.name.length) {
          this.context[lib.name] = lib;
        } else if (Object.prototype.toString.call(lib) === '[object Object]') {
          Object.keys(lib).forEach(function(name){
            this.context[name] = lib[name];
          }, this);
        } else {
          this.context[name] = lib;
        }
      }

      this.context._ = lib;
      this.inspector();
    }
  },

  'Auto-Includer': {
    help: 'Type the name of a built-in module to include it on the current context.',
    type: 'keywords',
    activation: require('../settings/builtins').libs,
    action: function(lib){
      this.context._ = this.context.ctx[lib] = require(lib);
      this.inspector();
    }
  },
};



function toggle(section, prop){
  return function(){
    this[section][prop] = !this[section][prop];
    if (this[section][prop]) {
      this.timedPrompt('++' + prop, style.prompt.toggleOn);
    } else {
      this.timedPrompt('--' + prop, style.prompt.toggleOff);
    }
  }
}

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

module.exports = function(target){
  var keybinds = new Map;
  var cadenceOn;

  target.rli.input.on('keypress', function(line, key){
    if (!key) return
    if (keybinds.has(key.bind)) {
      target.rli.line = target.rli.line.slice(0,-1);
      keybinds.get(key.bind).forEach(function(action){
        action.call(target, line);
      });
    }
  });

  function cadence(keybind, action){
    return function setBind(){
      target.rli.input.once('keypress', function(line, key){
        if (!key) return setBind();
        if (keybind === key.bind) {
          action.call(target, line);
        }
      });
    }
  }

  var handlers = {
    keybind: function(bind, action){
      if (~bind.indexOf(' ')) {
        var keys = bind.split(' ');
        while (keys.length > 1) {
          bind = keys.pop();
          action = cadence(bind, action);
        }
        bind = keys.pop();
      }
      if (keybinds.has(bind)) {
        var binds = keybinds.get(bind);
      } else {
        var binds = keybinds.set(bind, []);
      }
      binds.push(action);
    },
    keywords: function(keywords, action){
      keywords.forEach(function(kw){
        target.commands.set(kw, action);
      });
    },
    keyword: function(kw, action){
      target.commands.set(kw, action);
    },
    command: function(cmd, action){
      target.commands.set(cmd, action);
    }
  };

  Object.keys(commands).forEach(function(name){
    var command = commands[name];
    var control = controls[name] || command;
    var activation = control.activation;
    var help = command.help;

    if (control.type) {
      handlers[control.type](control.activation, command.action);
    }

    if (control.type === 'keybind' && process.platform === 'darwin') {
      activation = activation.replace('ctrl+', 'command+');
    }

    target.help.push({
      name: name,
      help: command.help,
      type: control.type,
      activation: activation
    });
  });
}