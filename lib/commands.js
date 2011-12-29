var util = require('util');
var fs = require('fs');

var controls = require('../settings/controls');

var colors = require('./utilities').color;
var chunk = require('./utilities').chunk;
var indent = require('./utilities').indent;

var commands = {
  'Command List': {
    help: 'Shows this list.',
    action: call('showHelp')
  },

  'Create Context': {
    help:    'Create, initialize, and switch into a new V8 context.',
    action:   call('createContext')
  },
  'Delete Context': {
    help:    'Delete the current V8 context and all objects unreferences externally.',
    action:  call('deleteContext')
  },
  'Next Context': {
    help:    'Instantly switch from current context to the next one in order.',
    action:  call('changeContext', 1)
  },
  'Previous Context': {
    help:    'Switch to the previous context.',
    action:   call('changeContext', -1)
  },
  'Reset Context': {
    help:    'Reset current context.',
    action:  call('resetContext')
  },
  'Label Context': {
    help:    'Change the label of the current context.',
    action: function(name){
      this.settings.name = name;
      this.displayPrompt();
    }
  },

  'Toggle Builtins': {
    help:    'Toggle whether default built-in objects are shown.',
    action:   toggle('builtins')
  },
  'Toggle Colors': {
    help:    'Toggle whether output is colored.',
    action:   toggle('colors')
  },
  'Toggle Hiddens': {
    help:    'Toggle whether hidden properties are shown.',
    action:   toggle('hiddens')
  },

  'Inspector Depth': {
    help:    'Set or view maximum depth to inspect.',
    action: function(depth){
       if (depth > 0 || depth === '0') {
        this.settings.depth = parseInt(depth);
       }
       this.clearInput();
       this.timedMessage('depth is ' + this.settings.depth, 'byellow');
     }
   },


  'Clear': {
    help:        'Break, and also clear the local context.',
    action:      function(){ this.clear() } },

  'Exit': {
    help:        'Exit the repl.',
    action:      function(){ this.rli.close() } },

  'Save Session': {
    help:        'Save all evaluated commands in this REPL session to a file.',
    action: function(file) {
     try {
       fs.writeFileSync(file, this.lines.join('\n'));
       this.write('Session saved to:' + file + '\n');
     } catch (e) {
       this.write('Failed to save:' + file)
     }
     this.displayPrompt();
    }
  },

  'Inject REPL': {
    help:     'Adds a reference to the live repl object to the current context.',
    action: function(){
      this.context.repl = this;
      this.context._ = this;
      this.print(this.context._);
      this.displayPrompt();
    }
  },

  'Auto-Includer': {
    help:       'Type the name of a built-in module to include it on the current context.',
    type:       'keywords',
    keywords:   [ 'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram',
                  'dns', 'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode',
                  'querystring', 'readline', 'string_decoder', 'tls', 'tty', 'url',
                  'util', 'vm', 'zlib' ],
    action: function(lib){
      this.context[lib] = require(lib);
    }
  },
};



function toggle(prop){
  return function(){
    this.settings[prop] = !this.settings[prop];
    if (this.settings[prop]) {
      this.timedMessage('++' + prop, 'byellow');
    } else {
      this.timedMessage('--' + prop, 'yellow');
    }
  }
}

function call(prop, args){
  if (typeof args === 'undefined') {
    args = [];
  } else if (!Array.isArray(args)) {
    args = [args];
  }
  return function(){
    return this[prop].apply(this, args);
  }
}

module.exports = function(target){
  Object.keys(commands).forEach(function(name){
    var command = commands[name];
    var control = controls[name] || command;
    var label = control.activation;
    var help = command.help;

    if (control.type === 'keybind' && process.platform === 'darwin') {
      label = label.replace('ctrl+', 'command+');
    }

    if (control.type === 'keywords') {
      label = command.keywords
    }

    target.help.push({
      name: name,
      help: command.help,
      type: control.type,
      activation: label || ''
    });


    switch (control.type) {
      case 'keybind':
        target.keybinds.set(control.activation, command.action);
        break;
      case 'keyword':
        target.keywords.set(control.activation, command.action);
        break;
      case 'command':
        // TODO: change this to use keywords
        target.commands[control.activation] = command;
        break;
      case 'keywords':
        command.keywords.forEach(function(lib){
          target.keywords.set(lib, command.action);
        });
        break;
    }
  });
}