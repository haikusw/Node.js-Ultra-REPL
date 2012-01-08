var util = require('util');
var fs = require('fs');
var path = require('path');

var Dict = require('../lib/Dict');

var style = require('../settings/styling');

// TODO turn this whole thing in a class with some structure

var controls = require('../settings/controls')(
  function(x){ return { type: 'keyword', trigger: x } },
  function(x){ return { type: 'command', trigger: x } },
  function(x){ return { type: 'keybind', trigger: x } }
);


module.exports = function(target){
  var keybinds = new Dict;
  var lastpress = Date.now();
  var cmds = target.commands = new Dict;

  target.rli.on('keybind', function(key){
    if (keybinds.has(key.bind)) {
      key.used = true;
      keybinds[key.bind].forEach(function(action){
        action.call(target);
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


  var loadModule = target.loadModule = function loadModule(name){
    var commands = {};
    var mod = require(path.resolve(__dirname, '../modules', name));

    var help = mod.map(function(command){
      commands[command.name] = command;

      if (command.defaultTrigger && !(command.name in controls)) {
         controls[command.name] = command.defaultTrigger
      };

      if (!command.help) return '';

      var info = { name: command.name, help: command.help };
      if (controls[command.name]) {
        info.type = controls[command.name].type;
        info.trigger =  controls[command.name].trigger;
      }
      return info;
    });

    initializeControls(commands, controls);
    return help;
  };

  require('../settings/options').autoload.forEach(loadModule);

  function initializeControls(commands, controls){
    Object.keys(commands).forEach(function(name){
      var control = controls[name] || commands[name];

      if (control.type) {
        handlers[control.type](control.trigger, commands[name].action);
      }

      if (!('help' in commands[name])) return;

      if (control.type === 'keybind' && process.platform === 'darwin') {
        control && control.trigger = control.trigger.replace('ctrl+', 'command+');
      }

      target.help.push({
        name: name,
        help: commands[name].help,
        type: control.type,
        trigger: control.trigger
      });
    });
  }
}