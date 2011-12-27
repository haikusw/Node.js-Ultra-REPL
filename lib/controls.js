var colors = require('./colors');
var util = require('util');

module.exports = function attachCommands(target){
  controls.forEach(function(control){

    switch (control.activation) {
      case 'repl_command':
        target.defineCommand(control.command.slice(1), {
          help: control.help,
          action: control.action
        });
        break;
      case 'key':
        keybinds[control.key] = target[control.command].bind(target);
        break;
      case 'keyword_set':
        control.keywords.forEach(function(keyword){
          target.keywords.set(keyword, control.action)
        });
        break;
    }
  });
  target.rli.input.on('keypress', keypressHandler);
}


var mods = [
/*0*/ '',
/*1*/ '+ctrl',
/*2*/ '+meta',
/*3*/ '+ctrl+meta',
/*4*/ '+shift',
/*5*/ '+ctrl+shift',
/*6*/ '+meta+shift',
/*7*/ '+ctrl+meta+shift',
];

var keybinds = {};

function keypressHandler(line, key){
  if (!key) return;
  var keybind = key.name + mods[key.ctrl | key.meta << 1 | key.shift << 2];
  if (keybind in keybinds) {
    return keybinds[keybind](line);
  }
}



var t = {
  shown:    [ 'shown',    'byellow' ],
  hidden:   [ 'hidden',   'bblack'  ],
  enabled:  [ 'enabled',  'byellow' ],
  disabled: [ 'disabled', 'bblack'  ],
};


var controls = [{
    name: 'Create Context',
    help: 'Create, initialize, and switch into a new V8 context.',
    activation: 'key',
    command: 'createContext',
    key: 'insert+shift'
  },{
    name: 'Delete Context',
    help: 'Delete the current V8 context and all objects unreferences externally.',
    activation: 'key',
    command: 'deleteContext',
    key:  'delete+shift'
  },{
    name: 'Next Context',
    help: 'Instantly switch from current context to the next one in order.',
    activation: 'key',
    command: 'nextContext',
    key: 'pageup'
  },{
    name: 'Previous Context',
    help: 'Switch to the previous context.',
    activation: 'key',
    command: 'prevContext',
    key: 'pagedown'
  },{
    name: 'Toggle Builtins',
    help: 'Toggle whether default built-in objects are shown',
    activation: 'repl_command',
    command: '.builtins',
    action: toggle('hideBuiltins', 'Builtins', [t.hidden, t.shown])
  },{
    name: 'Toggle Colors',
    help: 'Toggle whether output is colored',
    activation: 'repl_command',
    command: '.color',
    action: toggle('useColors', 'Colors', [t.enabled, t.disabled])
  },{
    name: 'Toggle Hiddens',
    help: 'Toggle whether hidden properties are shown',
    activation: 'repl_command',
    command: '.hidden',
    action: toggle('showHidden', 'Hidden properties', [t.shown, t.hidden])
  },{
    name: 'Inspection Recurse Depth',
    help: 'Toggle maximum depth to inspect',
    activation: 'repl_command',
    command: '.depth',
    action: function(depth){
      var context = this.iterator.getCurrent();
      if (depth > 0 || depth === 0) {
        return this.print(['Max Depth', 'bmagenta'], ['set to'], [context.maxDepth = depth, 'byellow']);
      } else if (depth.length === 0) {
        return this.print(['Max Depth', 'magenta'], ['is'], [context.maxDepth, 'yellow']);
      } else {
        return this.print(['Max Depth must be a number', 'Error']);
      }
    }
  },{
    name: 'Context Label',
    help: 'Change the label of the current context',
    activation: 'repl_command',
    command: '.label',
    action: function(name){
      var context = this.iterator.getCurrent();
      context.name = name;
      this.displayPrompt();
    }
  },{
    name: 'Command List',
    help: 'List of repl commands',
    activation: 'repl_command',
    command: '.help',
    action: function() {
      var self = this;
      var max = controls.reduce(function(a, b){  return a > b.name.length ? a : b.name.length }, 0)
      this.print(controls.map(function(control){
        var command = control.key || control.command;
        if (control.activation === 'keyword_set') {
          command = ''//control.keywords.join(', ').match(/^((?:.{10,20}[, \]]{1,3})*)$/)
        }
        return colors(margins(max + 4, control.name), 'cyan') +
                 colors(margins(max + 4, command), 'green') +
                 colors(control.help || '', 'bblack');
      }).join('\n'));
      this.displayPrompt();
    }
  },{
    name: 'Clear',
    help: 'Break, and also clear the local context',
    activation: 'repl_command',
    command: '.clear',
    action: function() {
      this.outputStream.write('Clearing context...\n');
      this.bufferedCommand = '';
      this.resetContext(true);
      this.displayPrompt();
    }
  },{
    name: 'Exit',
    help: 'Exit the repl',
    activation: 'repl_command',
    command: '.exit',
    action: function() {
      this.rli.close();
    }
  },{
    name: 'Save Session',
    help: 'Save all evaluated commands in this REPL session to a file',
    activation: 'repl_command',
    command: '.save',
    action: function(file) {
      try {
        fs.writeFileSync(file, this.lines.join('\n') + '\n');
        this.outputStream.write('Session saved to:' + file + '\n');
      } catch (e) {
        this.outputStream.write('Failed to save:' + file+ '\n')
      }
      this.displayPrompt();
    },
  },{
    name: 'Auto-require Built-in Libs',
    help: 'Type the name of a built-in module to include it on the current context.',
    activation: 'keyword_set',
    keywords: [ 'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram',
                'dns', 'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode',
                'querystring', 'readline', 'repl', 'string_decoder', 'tls', 'tty', 'url',
                'util', 'vm', 'zlib' ],
    action: require
}];



function margins(width, str){
  var count = width - str.length;
  return str + Array(count > 0 ? count : 0).join(' ');
}


function toggle(prop, name, states){
  return function(){
    var context = this.iterator.getCurrent();
    context[prop] = !context[prop];
    //singular = singular ? 'is' : 'are';
    this.print([name, context[prop] ? 'cyan' : 'bcyan'], ['are now'], context[prop] ? states[0] : states[1]);
  }
}