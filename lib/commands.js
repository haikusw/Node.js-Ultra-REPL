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
      this.settings.name = name;
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
       this.clearInput();
       this.timedPrompt('depth is ' + this.context.depth, style.prompt.toggleOn);
     }
   },


  'Clear': {
    help: 'Clear the screen.',
    action: function(){ this.clearWindow() } },

  'Exit': {
    help: 'Exit the REPL.',
    action: function(){ this.rli.close() } },

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
    help: 'Adds a reference to the live repl object to the current context.',
    action: function(){
      this.context.ctx.repl = this;
      this.context._ = this;
      this.print(this.context._);
      this.displayPrompt();
    }
  },

  'Auto-Includer': {
    help: 'Type the name of a built-in module to include it on the current context.',
    type: 'keywords',
    keywords: require('../settings/builtins').libs,
    action: function(lib){
      return this.context.ctx[lib] = require(lib);
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
        target.commands.set(control.activation, command.action);
        break;
      case 'keywords':
        command.keywords.forEach(function(lib){
          target.commands.set(lib, command.action);
        });
        break;
    }
  });
}