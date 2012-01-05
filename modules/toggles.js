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
  { name: 'Toggle Builtins',
    help: 'Toggle whether default built-in objects are shown.',
    defaultTrigger: key('f2'),
    action: toggle('context', 'builtins')
  },
  { name: 'Toggle Hiddens',
    help: 'Toggle whether hidden properties are shown.',
    defaultTrigger: key('f3'),
    action: toggle('context', 'hiddens')
  },
  { name: 'Toggle __proto__',
    help: 'Toggle whether [[prototype]] trees are displayed.',
    defaultTrigger: key('f4'),
    action: toggle('context', 'protos')
  },
  { name: 'Inspect Depth--',
    help: 'Decrease inspector recurse depth',
    defaultTrigger: key('f5'),
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
    defaultTrigger: key('f6'),
    action: function(){
      this.context.depth++;
      this.refresh();
      this.timedPrompt('depth ' + this.context.depth, style.prompt['++']);
    }
  },
  { name: 'Toggle Colors',
    help: 'Toggle whether output is colored.',
    defaultTrigger: key('f9'),
    action: toggle('context', 'colors')
  },
  { name: 'Set Inspect Depth',
    help: 'Set inspector recurse depth\n',
    defaultTrigger: dot('depth'),
    action: function(cmd, depth){
      depth = parseInt(depth, 10);
      if (depth === this.context.depth || !(depth > 0)) {
        this.timedPrompt('depth ' + this.context.depth, style.prompt['--']);
        return this.rli.clearInput();
      }
      depth = depth > 1 ? depth : 1;
      this.timedPrompt('depth ' + depth, style.prompt[this.context.depth > depth ? '--' : '++']);
      this.context.depth = depth;
      this.refresh();
    }
  },
]


function keyword(x){ return { type: 'keyword', trigger: x } }
function dot(x){ return { type: 'command', trigger: '.' + x } }
function key(x){ return { type: 'keybind', trigger: x } }