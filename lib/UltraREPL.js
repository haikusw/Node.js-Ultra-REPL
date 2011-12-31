require('harmony-collections').attachIfMissing(global);

var util = require('util');
var vm = require('vm');
var path = require('path');
var repl = require('repl');
var REPLServer = repl.REPLServer;

var commands = require('./commands');
var UltraRLI = require('./UltraRLI');
var Evaluator = require('./Evaluator');

var fixEmitKey = require('./fixEmitKey');

var style = require('../settings/styling');
var builtins = require('../settings/builtins');

require('./string-utils').attachTo(String.prototype);

var __ = require('./object-utils').descriptor;
var maxLength = require('./string-utils').maxLength;
var chunk = require('./string-utils').chunk;


module.exports.UltraREPL = UltraREPL;


var mods = [ '', 'ctrl+', 'alt+', 'ctrl+alt+', 'shift+',
             'ctrl+shift+', 'alt+shift+', 'ctrl+alt+shift+' ];


function UltraREPL(options){
  options = options || {};

  this.context = new Evaluator;
  notifier(this.context, ['create', 'change', 'remove', 'reset', 'error'], this.alertHandler, this);

  String.prototype.color.context = this.context;

  this.appPrompt = options.prompt || 'js';
  this.commands = new Map;
  var keybinds = this.keybinds = new Map;
  this.help = [];
  this.buffered = [];
  this.lines = [];
  this.lines.level = [];


  var stream = initStream(options.stream);
  this.input = stream.input;
  this.output = stream.output;
  var complete = this.complete.bind(this);
  var rli = this.rli = new UltraRLI(stream, complete);


  rli.input.on('keypress', function(line, key){
    if (!key) return;
    var keybind = mods[key.ctrl | key.meta << 1 | key.shift << 2] + key.name;
    if (keybinds.has(keybind)) {
      keybinds.get(keybind).call(this, line);
    }
  }.bind(this));

  rli.on('close', stream.input.destroy.bind(stream.input));

  rli.on('line', function(cmd){
    cmd = trim(cmd)
    if (!cmd) return

    var matches = cmd.match(/^([^\s]+)\s+(.*)$/);
    if (matches !== null) {
      var result = this.keywordHandler(matches[1], matches[2]);
      if (result !== false) return;
    }

    this.buffered.push(cmd);
    var evaled = this.context.evaluate(this.buffered.join('\n'));

    if (evaled.status === 'success') {
      this.buffered = []
      this.inspector(evaled.output);
    } else if (evaled.status === 'error') {
      this.buffered = []
      this.inspector(evaled.result.stack);
    } else if (evaled.status === 'syntax error') {
      this.inspector(evaled)
    }

  }.bind(this));

  commands(this);

  this.context.columns = this.output.getWindowSize()[0];
  fixEmitKey(this.input);

  this.print(' ' + this.help[0].activation.color(style.help[this.help[0].type]) +
               ' to see command list'.color(style.help.intro));
  this.clearWindow();
  this.updatePrompt(true);
  this.home();
  this.rli._refreshLine();
}


UltraREPL.prototype = Object.create(REPLServer.prototype, {
  constructor: __(UltraREPL),

  alertHandler: __(function alertHandler(event, source, data){
    var type;
    switch (source) {
      case this.context: type = 'context'; break;
    }
    var info = style[type][event];
    if (info) {
      info[0].replace(/†(.*)†/g, function(a,b){ return data[b] });
      info[0].replace(/‡/g, function(a,b){ return data });
      if (info.length === 1) {
        this[info[0]]();
      } else {
        this[info[0]](info[1].color(info[2]));
      }
    }
  }),

  keywordHandler: __(function keywordHandler(cmd, params){
    if (this.commands.has(cmd)) {
      var result = this.commands.get(cmd).call(this, cmd, params);
      if (result !== undefined) {
        this.context._ = result;
        this.inspector();
      }
      return true;
    }
    return false;
  }),

  print: __(function print(text, color){
    if (Array.isArray(text)) {
      this.clearLine();
      return [].slice.call(arguments).forEach(function(s){
        if (s && s.length) {
          this.output.write(s[0].color(s[1]) + ' ');
        }
      }, this);
    }
    this.output.write(text.color(color));
  }),

  clearInput: __(function clearInput(){
    this.output.cursorTo(this.rli._promptLength);
    this.output.clearLine(1);
  }),

  clearLine: __(function clearLine(){
    this.output.clearLine();
    this.output.cursorTo(0);
  }),

  /*
  clearLine: __(function clearLine(index){
    if (typeof index !== 'undefined') {
      this.output.cursorTo(0, index);
    }
    this.output.clearLine();
    this.output.cursorTo(this.rli._promptLength + this.rli.cursor, this.output.getWindowSize()[1]);
  }),*/

  clearLines: __(function clearLines(from, to){
    from = from > to ? [to, to = from][0] : from;
    from = from > 0 ? from : 0;
    to = to < this.height ? to : this.height;
    for (; from < to; from++) {
      this.output.cursorTo(0, from);
      this.output.clearLine();
    }
    this.home();
  }),

  home: __(function home(){
    this.output.cursorTo(this.rli._promptLength, this.height);
    this.output.clearLine(1);
  }),

  height: __(function getter(){ return this.output.getWindowSize()[0] }),

  width: __(function getter(){ return this.output.getWindowSize()[1] }),

  clearWindow: __(function clearWindow(minus){
    this.print('\n'.repeat(this.height - +minus));
  }),

  displayPrompt: __(function displayPrompt() {
    if (this.buffered.length) {
      this.rli.setPrompt('...' + new Array(this.lines.level.length).join('..') + ' ');
    } else {
      this.updatePrompt();
    }
    this.rli.prompt();
  }),

  showHelp: __(function showHelp(){
    var nMax = maxLength(this.help, 'name') + 2;
    var aMax = maxLength(this.help, 'activation') + 2;
    var dMin = nMax + aMax + 2;
    var dMax = this.rli.output.getWindowSize()[0] - nMax - aMax - 5;

    var output = this.help.map(function(cmd){

      if (cmd.type === 'keywords' && cmd.activation !== '') {
        cmd.help += '\n' + chunk(', ', dMax, dMin, cmd.activation).color(style.help.keywords);
        cmd.activation = '';
      }

      return cmd.name.margin(nMax).color(style.help.names) +
             cmd.activation.margin(aMax).color(style.help[cmd.type]) +
             cmd.help;

    }, this);
    output.unshift('');
    this.print(output.join('\n'));
    this.clearWindow(-output.length);
    this.displayPrompt();
  }),

  updatePrompt: __(function updatePrompt(dontRefresh){
    var prompt = [this.appPrompt];
    if (this.context.count > 1) {
      prompt.push(((this.context.index + 1) + '/' + this.context.count).color(style.prompt.number));
      prompt.push(this.context.name);
    }
    if (this.messages) {
      prompt.push(this.messages);
      this.messages = null;
    }
    prompt = prompt.join(style.prompt.separator[0].color(style.prompt.separator[1]));
    prompt += style.prompt.end[0].color(style.prompt.end[1]);
    this.rli.setPrompt(prompt, prompt.alength);
    !dontRefresh && this.rli._refreshLine();
  }),

  inspector: __(function inspector(obj){
    var output;
    if (typeof obj === 'string') {
      output = obj;
    } else if (typeof obj !== 'undefined') {
      this.context._ = obj;
      output = this.context._;
    } else {
      output = this.context._;
    }
    this.clearLine();
    this.print('\n' + output + '\n');
    this.displayPrompt();
  }),

  timedPrompt: __(function timedPrompt(message, color, time){
    this.messages = message.color(color);
    this.updatePrompt();

    clearTimeout(this.timer);
    this.timer = setTimeout(this.updatePrompt.bind(this), time || 5000);
  }),


});


function notifier(emitter, event, handler, bind){
  if (Array.isArray(event)) {
    return event.forEach(function(event){
      notifier(emitter, event, handler, bind);
    });
  }
  emitter.on(event, function(){
    handler.apply(bind || handler, [event, emitter].concat([].slice.call(arguments)));
  });
}

function initStream(stream){
  if (stream) {
    if (stream.stdin || stream.stdout) {
      return { input: stream.stdin, output: stream.stdout };
    } else {
      return { input: stream, output: stream };
    }
  } else {
    process.stdin.resume();
    return { input: process.stdin, output: process.stdout };
  }
}



function trim(cmd) {
  var trimmer = /^\s*(.+)\s*$/m,
      matches = trimmer.exec(cmd);

  if (matches && matches.length === 2) {
    return matches[1];
  }
}