var Results = require('../lib/Results');
var Script = require('../lib/Script');



module.exports = [
  { name: 'Inject REPL',
    help: 'Adds a reference to the live repl object to the current context local scope.',
    defaultTrigger: api.keybind('f12'),
    action: function(){
      return this.context.current.locals.repl = this;
    }
  },
  { name: 'Key Display',
    help: 'Toggle displaying what keys are pressed.',
    defaultTrigger: api.keybind('f11'),
    action: api.toggle('keydisplay')
  },
  { name: 'Color Test',
    help: 'Test ANSI colors\n',
    defaultTrigger: api.keybind('f10'),
    action: function(){
      this.rli.clearScreen();
      this.header();

      var names = String.prototype.color.names.slice(0, String.prototype.color.names.length / 2);

      names.shift();
      var width = names.join('  ').length;

      var ansi = [];

      ansi[0] = names.map(function(c){ return c.color(c) });
      ansi[1] = names.map(function(c){ return c.color(['bg'+c,'bwhite'])});

      this.output.cursorTo(((this.width - width) / 2) | 0, ((this.height - ansi.length) / 2) | 0);
      ansi.forEach(function(s){
        this.output.write(s.join('  '));
        this.output.moveCursor(-width, 1);
      }, this);

      this.displayPrompt();
    }
  },
  { name: 'Inspect Real Global',
    help: 'Show the real global, which should be isolated from anything running in the repl.',
    defaultTrigger: api.keybind('f8'),
    action: function(){ return real.context.call(this) }
  },
]
var real = { context: realinit };

function realinit(){
  var globalContext = this.context.current.constructor.inspector.wrap.runInThisContext()(
    this.context.current.settings,
    this.settings,
    builtins,
    styling.inspector
  );
  real.context = function(){
    var globals  = globalContext.globals();
    delete globals.process;
    delete globals.Buffer;
    return globalContext.inspector(globals);
  }
  return real.context();
}