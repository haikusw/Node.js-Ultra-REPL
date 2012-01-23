var builtins = require('../lib/builtins');
var isError = require('../lib/object-utils').is('Error');
var style = require('../settings/styling');



function injectNodeBuiltins(){
  this.context.ctx.global = this.context.global;
  builtins.node.forEach(function(name){
    Object.defineProperty(this.context.ctx, name, Object.getOwnPropertyDescriptor(global, name));
  }, this);
  this.refresh();
}

function contexCommand(action){
  return function(){
    var result = this.context[action]();
    if (isError(result)) {
      result = result.message.color(style.error);
    } else {
      result = action.color(style.context[action]) + ' ' + result.name;
    }
    this.rli.timedWrite('topright', result, 'bgbblack');
    this.context._ = this.context.global;
    this.refresh();
  }
}

module.exports = [
  { name: 'Inject Node Builtins',
    help: 'Add the default Node global variables to the current context. This includes process, console, '+
          'Buffer, and the various ArrayBuffer functions.',
    defaultTrigger: { type: 'keybind', trigger: 'alt+a' },
    action: injectNodeBuiltins
  },
  { name: 'Create Context',
    help: 'Create, initialize, and switch into a new V8 context.',
    defaultTrigger: { type: 'keybind', trigger: 'ctrl+shift+up' },
    action: contexCommand('create')
  },
  { name: 'Delete Context',
    help: 'Delete the current V8 context and all objects unreferences externally.',
    defaultTrigger: { type: 'keybind', trigger: 'ctrl+shift+down' },
    action: contexCommand('remove')
  },
  { name: 'Reset Context',
    help: 'Reset current context.',
    defaultTrigger: { type: 'command', trigger: '.r' },
    action: contexCommand( 'reset')
  },
  { name: 'Next Context',
    help: 'Switch to the previous next.',
    defaultTrigger: { type: 'keybind', trigger: 'ctrl+up' },
    action: function(){
      this.context.change(1);
      this.context.ctx._ = this.context.global;
      this.refresh();
    }
  },
  { name: 'Previous Context',
    help: 'Switch to the previous context.',
    defaultTrigger: { type: 'keybind', trigger: 'ctrl+down' },
    action: function(){
      this.context.change(-1);
      this.context.ctx._ = this.context.global;
      this.refresh();
    }
  },
  { name: 'Label Context',
    help: 'Change the label of the current context.\n',
    defaultTrigger: { type: 'command', trigger: '.label' },
    action: function(cmd, name){
      this.context.name = name;
      this.updatePrompt();
    }
  }
]


