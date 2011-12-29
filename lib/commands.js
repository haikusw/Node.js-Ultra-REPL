var util = require('util');
var fs = require('fs');

var controls = require('./controls');

var colors = require('./utilities').color;

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
    help:    'Change the label of the current context',
    action: function(name){
      this.settings.name = name;
      this.displayPrompt();
    }
  },

  'Toggle Builtins': {
    help:    'Toggle whether default built-in objects are shown',
    action:   toggle('builtins')
  },
  'Toggle Colors': {
    help:    'Toggle whether output is colored',
    action:   toggle('colors')
  },
  'Toggle Hiddens': {
    help:    'Toggle whether hidden properties are shown',
    action:   toggle('hiddens')
  },

  'Inspect Depth': {
    help:    'Toggle maximum depth to inspect',
    action: function(depth){
       if (depth > 0 || depth === '0') {
         return this.print(['Max Depth', 'bmagenta'], ['set to'], [this.settings.depth = depth, 'byellow']);
       } else if (depth.length === 0) {
         return this.print(['Max Depth', 'magenta'], ['is'], [this.settings.depth, 'yellow']);
       } else {
         return this.print(['Max Depth must be a number', 'bred']);
       }
     }
   },


  'Clear': {
    help:        'Break, and also clear the local context',
    action:      function(){ this.clear() } },

  'Exit': {
    help:        'Exit the repl',
    action:      function(){ this.rli.close() } },

  'Save Session': {
    help:        'Save all evaluated commands in this REPL session to a file',
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

  'Auto-Includer': {
    help:       'Type the name of a built-in module to include it on the current context.',
    type:       'keywords',
    keywords:   [ 'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram',
                  'dns', 'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode',
                  'querystring', 'readline', 'repl', 'string_decoder', 'tls', 'tty', 'url',
                  'util', 'vm', 'zlib' ],
    action:     function(lib){ return this.context[lib] = require(lib) }
  },

  'Inject REPL': {
    help:     'Adds a reference to the live repl object to the current context',
    action: function(){
      this.context.repl = this;
      this.context._ = this;
      this.print(this.context._);
      this.displayPrompt();
    }
  }
};



function toggle(prop){
  return function(){
    var context = this.iterator.getCurrent();
    var on = this.settings[prop] = !this.settings[prop];
    this.print(['Toggled ' + prop + (on ? ' on' : ' off'), on ? 'bcyan' : 'cyan']);
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
  Object.keys(controls).forEach(function(name){
    var command = commands[name];
    var control = controls[name] || command;

    target.help.push({
      name: name,
      help: command.help,
      type: control.type,
      activation: control.activation || ''
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
        command.keywords.forEach(function(activation){
          target.keywords.set(activation, command.action);
        });
        break;
    }
  });
}