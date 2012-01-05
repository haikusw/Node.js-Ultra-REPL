var nodeBuiltins = require('../settings/builtins').node;
var isError = require('../lib/object-utils').is('Error');
var style = require('../settings/styling');

function injectNodeBuiltins(){
  nodeBuiltins.forEach(function(name){
    Object.defineProperty(this.context.ctx, name, Object.getOwnPropertyDescriptor(global, name));
  }, this);
  this.context._ = this.context.ctx;
  this.inspector();
}


function contexCommand(action){
  return function(){
    var result = this.context[action]();
    if (isError(result)) {
      result = result.message.color(style.error);
    } else {
      result = action.color(style.context[action]) + ' ' + result.name;
    }
    this.context._ = this.context.ctx;
    this.inspector();
    this.rli.timedWrite('topright', result, 'bgbblack');
    this.updatePrompt();
  }
}

function keyword(x){ return { type: 'keyword', trigger: x } }
function dot(x){ return { type: 'command', trigger: '.' + x } }
function key(x){ return { type: 'keybind', trigger: x } }

module.exports = [
  { name: 'Inject Node Builtins',
    defaultTrigger: key('alt+a'),
    help: 'Add the default Node global variables to the current context. This includes process, console, '+
          'Buffer, and the various ArrayBuffer functions.',
    action: injectNodeBuiltins
  },
  { name: 'Create Context',
    defaultTrigger: key('ctrl+shift+up'),
    help: 'Create, initialize, and switch into a new V8 context.',
    action: contexCommand('create')
  },
  { name: 'Delete Context',
    defaultTrigger: key('ctrl+shift+down'),
    help: 'Delete the current V8 context and all objects unreferences externally.',
    action: contexCommand('remove')
  },
  { name: 'Reset Context',
    defaultTrigger: dot('r'),
    help: 'Reset current context.',
    action: contexCommand( 'reset')
  },
  { name: 'Next Context',
    defaultTrigger: key('ctrl+up'),
    help: 'Switch to the previous next.',
    action: function(){
      this.context.change(1);
      this.updatePrompt();
    }
  },
  { name: 'Previous Context',
    defaultTrigger: key('ctrl+down'),
    help: 'Switch to the previous context.',
    action: function(){
      this.context.change(-1);
      this.updatePrompt();
    }
  },
  { name: 'Label Context',
    defaultTrigger: dot('label'),
    help: 'Change the label of the current context.\n',
    action: function(cmd, name){
      this.context.name = name;
      this.updatePrompt();
    }
  }
]