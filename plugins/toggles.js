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
  { name: 'Hiddens',
    help: 'Toggle whether hidden properties are shown.',
    defaultTrigger: { type: 'keybind', trigger: 'f2' },
    action: toggle('currentSettings', 'hiddens')
  },
  { name: 'Builtins',
    help: 'Toggle whether default built-in objects are shown.',
    defaultTrigger: { type: 'keybind', trigger: 'f3' },
    action: toggle('currentSettings', 'builtins')
  },
  { name: '__proto__',
    help: 'Toggle whether [[prototype]] trees are displayed.',
    defaultTrigger: { type: 'keybind', trigger: 'f4' },
    action: toggle('currentSettings', 'protos')
  },
  { name: 'Dense Format',
    help: 'Toggle showing multiple properties/array items per line.',
    defaultTrigger: { type: 'keybind', trigger: 'f5' },
    action: toggle('currentSettings', 'multiItemLines')
  },
  { name: 'Colors',
    help: 'Toggle whether output is colored.',
    defaultTrigger: { type: 'keybind', trigger: 'f9' },
    action: toggle('settings', 'colors')
  },
  { name: 'Depth--',
    help: 'Decrease inspector recurse depth',
    defaultTrigger: { type: 'keybind', trigger: 'alt+1' },
    action: function(){
      var settings = this.context.current.settings;
      if (settings.depth > 1) {
        settings.depth--;
        this.refresh();
        this.timedPrompt('depth ' + settings.depth, style.prompt['--']);
      }
    }
  },
  { name: 'Depth++',
    help: 'Increase inspector recurse depth',
    defaultTrigger: { type: 'keybind', trigger: 'alt+2' },
    action: function(){
      var settings = this.context.current.settings;
      settings.depth++;
      this.refresh();
      this.timedPrompt('depth ' + settings.depth, style.prompt['++']);
    }
  },
  { name: 'Set Depth',
    help: 'Set inspector recurse depth\n',
    defaultTrigger: { type: 'command', trigger: '.depth' },
    action: function(cmd, depth){
      var settings = this.context.current.settings;
      depth = parseInt(depth, 10);
      if (depth === settings.depth || !(depth > 0)) {
        this.timedPrompt('depth ' + settings.depth, style.prompt['--']);
        this.rli.clearInput();
      } else {
        depth = depth > 1 ? depth : 1;
        this.timedPrompt('depth ' + depth, style.prompt[settings.depth > depth ? '--' : '++']);
        settings.depth = depth;
        this.refresh();
      }
    }
  },
]