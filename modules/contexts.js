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


module.exports = [
  { name: 'Inject Node Builtins',
    help: 'Add the default Node global variables to the current context. This includes process, console, '+
          'Buffer, and the various ArrayBuffer functions.',
    defaultTrigger: key('alt+a'),
    action: injectNodeBuiltins
  },
  { name: 'Create Context',
    help: 'Create, initialize, and switch into a new V8 context.',
    defaultTrigger: key('ctrl+shift+up'),
    action: contexCommand('create')
  },
  { name: 'Delete Context',
    help: 'Delete the current V8 context and all objects unreferences externally.',
    defaultTrigger: key('ctrl+shift+down'),
    action: contexCommand('remove')
  },
  { name: 'Reset Context',
    help: 'Reset current context.',
    defaultTrigger: dot('r'),
    action: contexCommand( 'reset')
  },
  { name: 'Next Context',
    help: 'Switch to the previous next.',
    defaultTrigger: key('ctrl+up'),
    action: function(){
      this.context.change(1);
      this.updatePrompt();
    }
  },
  { name: 'Previous Context',
    help: 'Switch to the previous context.',
    defaultTrigger: key('ctrl+down'),
    action: function(){
      this.context.change(-1);
      this.updatePrompt();
    }
  },
  { name: 'Label Context',
    help: 'Change the label of the current context.\n',
    defaultTrigger: dot('label'),
    action: function(cmd, name){
      this.context.name = name;
      this.updatePrompt();
    }
  }
]


function keyword(x){ return { type: 'keyword', trigger: x } }
function dot(x){ return { type: 'command', trigger: '.' + x } }
function key(x){ return { type: 'keybind', trigger: x } }