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
  { name: 'Inject REPL',
    help: 'Adds a reference to the live repl object to the current context.',
    defaultTrigger: { type: 'keybind', trigger: 'f12' },
    action: function(){
      this.context._ = this.context.ctx.repl = this;
      this.inspector();
    }
  },
  { name: 'Toggle Key Display',
    help: 'Toggle displaying what keys are pressed.',
    defaultTrigger: { type: 'keybind', trigger: 'f11' },
    action: toggle('keydisplay')
  },
  { name: 'Color Test',
    help: 'Test ANSI colors\n',
    defaultTrigger: { type: 'keybind', trigger: 'f10' },
    action: function(){
      this.rli.clearScreen();
      this.header();

      var names = String.prototype.color.names;
      var width = names.join('').length / 2;
      var left = (this.width - width) / 2;
      var top = this.height / 2 - 2;

      names = [names.slice(0, names.length / 2), names.slice(names.length / 2 + 1)];

      this.output.cursorTo(left, top);
      names[0].forEach(function(color){
        this.output.write(color.color(color) + ' ');
      }, this);

      this.output.cursorTo(left, top + 2);
      names[1].forEach(function(color){
        this.output.write(color.slice(2).color(color) + ' ')
      }, this);

      this.displayPrompt();
    }
  },
]