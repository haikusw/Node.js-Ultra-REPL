var style = require('../settings/styling');


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


module.exports = [
  { name: 'Toggle Hiddens',
    help: 'Toggle whether hidden properties are shown.',
    defaultTrigger: { type: 'keybind', trigger: 'f2' },
    action: toggle('context', 'hiddens')
  },
  { name: 'Toggle Builtins',
    help: 'Toggle whether default built-in objects are shown.',
    defaultTrigger: { type: 'keybind', trigger: 'f3' },
    action: toggle('context', 'builtins')
  },
  { name: 'Toggle __proto__',
    help: 'Toggle whether [[prototype]] trees are displayed.',
    defaultTrigger: { type: 'keybind', trigger: 'f4' },
    action: toggle('context', 'protos')
  },
  { name: 'Inspect Depth--',
    help: 'Decrease inspector recurse depth',
    defaultTrigger: { type: 'keybind', trigger: 'f5' },
    action: function(){
      if (this.context.depth > 1) {
        this.context.depth--;
        this.refresh();
        this.timedPrompt('depth ' + this.context.depth, style.prompt['--']);
      }
    }
  },
  { name: 'Inspect Depth++',
    help: 'Increase inspector recurse depth',
    defaultTrigger: { type: 'keybind', trigger: 'f6' },
    action: function(){
      this.context.depth++;
      this.refresh();
      this.timedPrompt('depth ' + this.context.depth, style.prompt['++']);
    }
  },
  { name: 'Toggle Colors',
    help: 'Toggle whether output is colored.',
    defaultTrigger: { type: 'keybind', trigger: 'f9' },
    action: toggle('context', 'colors')
  },
  { name: 'Set Inspect Depth',
    help: 'Set inspector recurse depth\n',
    defaultTrigger: { type: 'command', trigger: '.depth' },
    action: function(cmd, depth){
      depth = parseInt(depth, 10);
      if (depth === this.context.depth || !(depth > 0)) {
        this.timedPrompt('depth ' + this.context.depth, style.prompt['--']);
        this.rli.clearInput();
      } else {
        depth = depth > 1 ? depth : 1;
        this.timedPrompt('depth ' + depth, style.prompt[this.context.depth > depth ? '--' : '++']);
        this.context.depth = depth;
        this.refresh();
      }
    }
  },
]