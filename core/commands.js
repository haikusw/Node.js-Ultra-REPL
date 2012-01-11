var util = require('util');
var fs = require('fs');
var path = require('path');

var Dict = require('../lib/Dict');

var style = require('../settings/styling');

// TODO turn this whole thing in a class with some structure



module.exports = function(target){
  var keybinds = new Dict;
  var lastpress = Date.now();
  var cmds = target.commands = new Dict;
  var commands = {};

  var controls = require('../settings/controls')(
    function(x){ return { type: 'keyword', trigger: x } },
    function(x){ return { type: 'command', trigger: x } },
    function(x){ return { type: 'keybind', trigger: x } }
  );

  target.rli.on('keybind', function(key){
    if (keybinds.has(key.bind)) {
      key.used = true;
      keybinds[key.bind].forEach(function(action){
        var result = action.call(target);
        result && target.inspector(result);
      });
    }

    if (target.keydisplay) {
      target.rli.timedWrite('topright', key.bind, style.info.keydisplay);
    }
    lastpress = Date.now();
  });

  function cadence(keybind, action){
    return function(){
      if (Date.now() - lastpress > 5000) return;

      target.rli.once('keybind', function(key){
        if (keybind === key.bind) {
          key.used = true;
          action.call(target);
        }
      });
    }
  }

  var handlers = {
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
    keywords: function(keywords, action){
      keywords.forEach(function(kw){ cmds[kw] = action });
    },
    keyword: function(kw, action){ cmds[kw] = action },
    command: function(cmd, action){ cmds[cmd] = action }
  };


  function loadModule(name){
    var mod = require(path.resolve(__dirname, '../modules', name));

    return mod.map(function(command){
      var control = controls[command.name] || command.defaultTrigger;

      if (control.type) {
        handlers[control.type](control.trigger, command.action);
      }

      if (control.type === 'keybind' && process.platform === 'darwin') {
        control && control.trigger = control.trigger.replace('ctrl+', 'command+');
      }

      return {
        name: command.name,
        help: command.help,
        type: control.type,
        trigger: control.trigger
      };
    });
  };

  target.loadModule = loadModule;

  require('../settings/options').autoload.forEach(function(name){
    this.push.apply(this, loadModule(name));
  }, target.help);
}