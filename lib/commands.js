var util = require('util');
var fs = require('fs');
var isError = require('./object-utils').is('Error');

var controls = require('../settings/controls');
var style = require('../settings/styling');

function contexCommand(action){
  return function(){
    var result = this.context[action]();
    if (isError(result)) {
      result = result.message.color(style.error);
    } else {
      result = action.color(style.context[action]) + ' ' + result.name;
    }
    this.clear();
    this.rli.timedWrite('topright', result);
    this.updatePrompt();
  }
}

var commands = {
  'Command List': {
    help: 'Shows this list.',
    action: call('showHelp')
  },

  'Create Context': {
    help: 'Create, initialize, and switch into a new V8 context.',
    action: contexCommand('create')
  },
  'Delete Context': {
    help: 'Delete the current V8 context and all objects unreferences externally.',
    action: contexCommand('remove')
  },
  'Reset Context': {
    help: 'Reset current context.',
    action: contexCommand( 'reset')
  },
  'Next Context': {
    help: 'Switch to the previous next.',
    action: function(){
      this.context.change(1);
      this.updatePrompt();
    }
  },
  'Previous Context': {
    help: 'Switch to the previous context.',
    action: function(){
      this.context.change(-1);
      this.updatePrompt();
    }
  },
  'Label Context': {
    help: 'Change the label of the current context.\n',
    action: function(name){
      this.context.name = name;
      this.updatePrompt();
    }
  },

  'Next Page': {
    help: 'Next page of results.',
    action: function(){
      if (this.pages.count() === 0)  return;
      this.rli.writePage(this.pages.next());
      this.pageLabel();
    }
  },
  'Previous Page': {
    help: 'Previous page of results.\n',
    action: function(){
      if (this.pages.count() === 0)  return;
      this.rli.writePage(this.pages.previous());
      this.pageLabel();
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

  'Inspect Depth--': {
    help: 'Decrease inspector recurse depth',
    action: function(){
      if (this.context.depth > 1) {
        this.context.depth--;
        this.refresh();
        this.timedPrompt('depth ' + this.context.depth, style.prompt['--']);
      }
    }
  },
  'Inspect Depth++': {
    help: 'Increase inspector recurse depth',
    action: function(){
      this.context.depth++;
      this.refresh();
      this.timedPrompt('depth ' + this.context.depth, style.prompt['++']);
    }
  },

  'Toggle Key Display': {
    help: 'Toggle displaying what keys are pressed for checking keybindings.\n',
    action: toggle('keydisplay')
  },


  'Clear Input/Screen': {
    help: 'Clear the the input line if it has text or clears the screen if not.',
    action: function(){ this.rli.line.trim().length ? this.resetInput() : this.resetScreen() } },
  'Clear Screen': {
    help: 'Clear the screen.',
    action: function(){ this.resetScreen() } },
  'Exit': {
    help: 'Exit the REPL.\n',
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
    help: 'Require for contexts without exposing require to the context. If passed two parameters the first is used to name it globally. If exports it a named function its name will be used. If an object its properties will be copied globally.\n.',
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
    trigger: require('../settings/builtins').libs,
    action: function(lib){
      this.context._ = this.context.ctx[lib] = require(lib);
      this.inspector();
    }
  },
};

function toggle(obj, prop){
  return function(){
    if (typeof prop === 'undefined') {
      var result = (this[obj] ^= true);
    } else {
      var result = (this[obj][prop] ^= true);
    }
    result = result ? '++' : '--';
    this.refresh();
    this.timedPrompt(result + (prop || obj), style.prompt[result]);
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
  var add = target.commands.set.bind(target.commands);
  var lastpress = Date.now();

  target.rli.input.on('keypress', function(v, key){
    key = key || target.rli.translate(v, key);
    if (keybinds.has(key.bind)) {
      target.rli.line = target.rli.line.slice(0,-1);
      keybinds.get(key.bind).forEach(function(action){
        action.call(target, v);
      });
    }

    if (target.keydisplay) {
      target.rli.timedWrite('topright', key.bind.color(style.info.keydisplay));
    }
    lastpress = Date.now();
  });

  function cadence(keybind, action){
    return function(){
      if (Date.now() - lastpress > 5000) return;
      target.rli.input.once('keypress', function(v, key){
        key = key || target.rli.translate(v, key);
        if (keybind === key.bind) {
          return action.call(target, v);
        }
      });
    }
  }

  var handlers = {
    keybind: function(bind, action){
      var keys = bind.split(' ');
      bind = keys.pop();
      while (keys.length) {
        action = cadence(bind, action);
        bind = keys.pop();
      }
      var binds = keybinds.has(bind) ? keybinds.get(bind) : keybinds.set(bind, [])
      binds.push(action);
    },
    keywords: function(keywords, action){
      keywords.forEach(function(kw){ add(kw, action) });
    },
    keyword: function(kw, action){ add(kw, action) },
    command: function(cmd, action){ add(cmd, action) }
  };

  Object.keys(commands).forEach(function(name){
    var control = controls[name] || commands[name];

    if (control.type) {
      handlers[control.type](control.trigger, commands[name].action);
    }

    if (control.type === 'keybind' && process.platform === 'darwin') {
      control.trigger = control.trigger.replace('ctrl+', 'command+');
    }

    target.help.push({
      name: name,
      help: commands[name].help,
      type: control.type,
      trigger: control.trigger
    });
  });
}