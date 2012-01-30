var EventEmitter = require('events').EventEmitter;

var Dict = require('../lib/Dict');

var options = require('../settings/options');
var style = require('../settings/styling');



module.exports = Commander;


function Commander(rli){
  var lastpress = Date.now();

  Object.defineProperty(this, 'lastpress', { get: function(){ return lastpress }, enumerable: true });

  var controls = this.controls = this.loadControls('../settings/controls');
  var keybinds = this.keybinds = new Dict;
  var keywords = this.keywords = new Dict;

  var self = this;

  function cadence(keybind, action){
    return function(){
      if (Date.now() - lastpress > 5000) return;

      rli.once('keybind', function(key){
        if (keybind === key.bind) {
          key.used = true;
          self.emit('keybind', action);
        }
      });
    }
  }

  this.handlers = {
    keybind: function(bind, action){
      var keys = bind.split(' ');
      bind = keys.pop();
      while (keys.length) {
        action = cadence(bind, action);
        bind = keys.pop();
      }
      var binds = keybinds.has(bind) ? keybinds.get(bind) : keybinds.set(bind, [])
      binds.push(action);
    },
    keywords: function(kws, action){
      kws.forEach(function(kw){ keywords[kw] = action });
    },
    keyword: function(kw, action){ keywords[kw] = action },
    command: function(cmd, action){ keywords[cmd] = action }
  };

  rli.on('keybind', function(key){
    if (keybinds.has(key.bind)) {
      key.used = true;
      keybinds[key.bind].forEach(function(action){
        self.emit('keybind', action);
      });
    }
    lastpress = Date.now();
  });

  this.help = [];

  options.autoload.forEach(function(name){
    this.help.push.apply(this.help, this.loadPlugin(name));
  }, this);
}


Commander.prototype = {
  constructor: Commander,
  __proto__: EventEmitter.prototype,

  loadControls: function loadControls(file){
    var controls = require(file);
    return controls(
      function(x){ return { type: 'keyword', trigger: x } },
      function(x){ return { type: 'command', trigger: x } },
      function(x){ return { type: 'keybind', trigger: x } }
    );
  },

  loadPlugin: function loadPlugin(name){
    var commands = require('../plugins/' + name);

    return commands.map(function(command){
      var control = this.controls[command.name] || command.defaultTrigger;

      if (control.type) {
        this.handlers[control.type](control.trigger, command.action);
      }

      if (control.type === 'keybind' && process.platform === 'darwin') {
        control && (control.trigger = control.trigger.replace('ctrl+', 'command+'));
      }

      return {
        name: command.name,
        help: command.help,
        type: control.type,
        trigger: control.trigger
      };
    }, this);
  },

  keyword: function keyword(cmd){
    if (this.keywords.has(cmd)) {
      this.emit('keyword', this.keywords[cmd], cmd, cmd);
      return true;
    } else {
      var m = cmd.match(/^([^\s]+)\s+(.*)$/);
      if (m !== null && this.keywords.has(m[1])) {
        this.emit('keyword', this.keywords[m[1]], m[1], m[2]);
        return true;
      }
    }
    return false;
  },
};
