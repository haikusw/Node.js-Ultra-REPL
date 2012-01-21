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
      return this.context.ctx.repl = this;
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

      var names = String.prototype.color.names.slice(0, String.prototype.color.names.length / 2);

      names.shift()
      var width = names.join('  ').length;

      var ansi = [];

      ansi[0] = names.map(function(c){ return c.color(c) });
      ansi[1] = names.map(function(c){ return c.color('bg'+c)});
      // ansi[2] = names.map(function(c){ return (c.slice(0, c.length / 2) + c.slice(c.length / 2).color('reverse')).color(c) });
      // ansi[3] = names.map(function(c){ return (c.slice(0, c.length / 2) + c.slice(c.length / 2).color('reverse')).color('bg'+c) });

      this.output.cursorTo(((this.width - width) / 2) | 0, ((this.height - ansi.length) / 2) | 0);
      ansi.forEach(function(s){
        this.output.write(s.join('  '));
        this.output.moveCursor(-width, 1);
      }, this);

      require('fs').writeFileSync('ansi.txt', ansi.join('\n'));

      this.displayPrompt();
    }
  },
]