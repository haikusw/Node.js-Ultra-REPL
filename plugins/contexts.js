var builtins = require('../lib/builtins');
var isError = require('../lib/object-utils').is('Error');
var style = require('../settings/styling');



function nodeBuiltins(){
  this.context.current.setGlobal();
  builtins.node.forEach(function(name){
    Object.defineProperty(this.context.ctx, name, Object.getOwnPropertyDescriptor(global, name));
  }, this);
  this.refresh();
}

function contextCommand(action){
  return function(){
    var result = this.context[action]();
    if (isError(result)) {
      result = result.message.color(style.error);
    } else {
      result = action.color(style.context[action]) + ' ' + result.displayName;
    }
    this.writer(this.context.view());
    if (action in style.context) {
      this.rli.timedWrite('topright', result, 'bgbblack');
    }
    this.updatePrompt();
  }
}

module.exports = [
  { name: 'Node Builtins',
    help: 'Add the default Node global variables to the current context. This includes process, console, '+
          'Buffer, and the various ArrayBuffer functions.',
    defaultTrigger: { type: 'keybind', trigger: 'alt+a' },
    action: nodeBuiltins
  },
  { name: 'Create Context',
    help: 'Create, initialize, and switch into a new V8 context.',
    defaultTrigger: { type: 'keybind', trigger: 'ctrl+shift+up' },
    action: contextCommand('create')
  },
  { name: 'Delete Context',
    help: 'Delete the current V8 context and all objects unreferences externally.',
    defaultTrigger: { type: 'keybind', trigger: 'ctrl+shift+down' },
    action: contextCommand('remove')
  },
  { name: 'Reset Context',
    help: 'Reset current context.',
    defaultTrigger: { type: 'command', trigger: '.r' },
    action: contextCommand( 'reset')
  },
  { name: 'Next Context',
    help: 'Switch to the Next context.',
    defaultTrigger: { type: 'keybind', trigger: 'ctrl+up' },
    action: contextCommand( 'next')
  },
  { name: 'Previous Context',
    help: 'Switch to the previous context.',
    defaultTrigger: { type: 'keybind', trigger: 'ctrl+down' },
    action: contextCommand( 'prev')
  },
  { name: 'Label Context',
    help: 'Change the label of the current context.\n',
    defaultTrigger: { type: 'command', trigger: '.label' },
    action: function(cmd, name){
      this.context.name = name;
      this.updatePrompt();
    }
  },
  // { name: 'Experimental Context',
  //   help: 'Loads a new context including a custom version of the NativeModule as well as all new core modules.',
  //   defaultTrigger: { type: 'keybind', trigger: 'alt+3' },
  //   action: function(cmd, name){
  //     var NodeContext = require('../core/NodeContext');
  //     var context = new NodeContext(this.settings);
  //     this.context.add(context);
  //     context.initProcess();
  //     context.initEmptyMain();
  //     return context;
  //   }
  // }
]