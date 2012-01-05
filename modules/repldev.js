var style = require('../settings/styling');

module.exports = [
  { name: 'Inject REPL',
    help: 'Adds a reference to the live repl object to the current context.',
    defaultTrigger: key('f12'),
    action: function(){
      this.context._ = this.context.ctx.repl = this;
      this.inspector();
    }
  },
  { name: 'Toggle Key Display',
    help: 'Toggle displaying what keys are pressed.',
    defaultTrigger : key('f11'),
    action: toggle('keydisplay')
  },
  { name: 'Color Test',
    help: 'Test ANSI colors\n',
    defaultTrigger: key('f10'),
    action: function(){
      var width = names.join('').length / 2;
      var left = (this.width - width) / 2;
      var top = this.height / 2 - 2;

      var names = String.prototype.color.names;
      names = [names.slice(0, names.length / 2), names.slice(names.length / 2 + 1)];

      this.output.cursorTo(left, top);
      names[0].forEach(function(color){
        this.output.write(color.color(color) + ' ');
      }, this);

      this.output.cursorTo(left, top + 2);
      names[1].forEach(function(color){
        this.output.write(color.slice(2).color(color) + ' ')
      }, this);

      this.rli.home();
    }
  },
]

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


function keyword(x){ return { type: 'keyword', trigger: x } }
function dot(x){ return { type: 'command', trigger: '.' + x } }
function key(x){ return { type: 'keybind', trigger: x } }