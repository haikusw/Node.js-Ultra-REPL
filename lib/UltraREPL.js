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
var widest = require('./string-utils').widest;
var chunk = require('./string-utils').chunk;


module.exports.UltraREPL = UltraREPL;



function UltraREPL(options){
  options = options || {};

 var context = this.context = new Evaluator;
  notifier(this.context, ['create', 'change', 'remove', 'reset', 'error'], this.alertHandler, this);

  String.prototype.color.context = this.context;

  this.appPrompt = options.prompt || 'js';
  this.buffered = [];
  this.lines = [];
  this.help = [];
  this.lines.level = [];
  this.keydisplay = false;

  var stream;
  if (options.stream) {
    if (options.stream.stdin || options.stream.stdout) {
      stream = { input: options.stream.stdin, output: options.stream.stdout };
    } else {
      stream = { input: options.stream, output: options.stream };
    }
  } else {
    process.stdin.resume();
    stream = { input: process.stdin, output: process.stdout };
  }

  this.input = stream.input;
  this.output = stream.output;

  fixEmitKey(this.input);


  var complete = this.complete.bind(this);
  var rli = this.rli = new UltraRLI(stream, complete);


  rli.on('close', stream.input.destroy.bind(stream.input));

  rli.on('line', function(cmd){
    if (!(cmd = cmd.trim())) return

    if (this.keyword(cmd) !== false) return;

    var m = cmd.match(/^([^\s]+)\s+(.*)$/);
    if (m !== null && this.keyword(m[1], m[2]) !== false) return

    this.buffered.push(cmd);
    var evaled = context.evaluate(this.buffered.join('\n'));

    if (evaled.status === 'syntax error') {
      return this.inspector(this.context._);
    }

    this.buffered = []
    this.inspector(evaled.status === 'success' ? evaled.output : evaled.result.stack);

  }.bind(this));

  this.commands = new Map;
  commands(this);

  this.context.columns = this.width;

  this.output.write(' ' + this.help[0].trigger.color(style.help[this.help[0].type]) +
               ' to see command list'.color(style.help.intro));
  this.help = generateHelp(this.help, this.width);
  this.rli.fill();
  this.updatePrompt(true);
  this.rli.clearInput();
}


UltraREPL.prototype = Object.create(REPLServer.prototype, {
  constructor: __(UltraREPL),

  height: __(function getter(){
    var val = this.output.getWindowSize()[1];
    Object.defineProperty(this, 'height', __(val));
    return val;
  }),

  width: __(function getter(){
    var val = this.output.getWindowSize()[0];
    Object.defineProperty(this, 'width', __(val));
    return val;
  }),

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

  keyword: __(function keyword(cmd, params){
    if (this.commands.has(cmd)) {
      var result = this.commands.get(cmd).call(this, cmd, params);
      if (result !== undefined) {
        this.context._ = result;
        this.inspector(this.context._);
      }
      return true;
    }
    return false;
  }),

  resetInput: __(function resetInput(){
    this.buffered = [];
    this.rli.clearInput();
  }),

  resetScreen: __(function resetScreen(){
    this.rli.clearScreen();
    this.rli.clearInput();
  }),

  displayPrompt: __(function displayPrompt(){
    if (this.buffered.length) {
      this.rli.setPrompt('...' + '..'.repeat(this.lines.level.length) + ' ');
    }
    this.rli.clearInput();
  }),

  showHelp: __(function showHelp(){
    this.rli.clearScreen();
    this.rli.writeFrom(this.help);
    this.resetInput();
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
    this.rli.setPrompt(prompt);
  }),

  inspector: __(function inspector(obj){
    var output = this.context._;
    if (typeof obj === 'string') {
      output = obj;
    } else if (typeof obj === 'object') {
      output = this.context._ = obj;
    }
    output = output.split(/\r\n|\n|\r/);
    var pages = output.length / this.height;
    var lines = output.length > this.height ? this.height : output.length;
    this.rli.writeFrom(output);
    this.resetInput();
  }),

  timedPrompt: __(function timedPrompt(message, color, time){
    this.messages = message.color(color);
    this.updatePrompt();
    clearTimeout(this.timer);
    this.timer = setTimeout(this.updatePrompt.bind(this), time || 5000);
  }),

});

function generateHelp(help, screenW){
  var nameW = widest(help, 'name') + 2;
  var triggerW = widest(help, 'trigger') + 2;
  var helpL = nameW + triggerW + 2;
  var helpR = screenW - nameW - triggerW - 4;
  return help.map(function(cmd){
    var trigger = cmd.trigger || '';
    if (cmd.type === 'keywords') {
      cmd.help += '\n' + chunk(', ', helpR - 4, helpL + 2, trigger).color(style.help.keywords);
      trigger = '';
    } else {
      cmd.help = cmd.help.align(helpR, helpL);
    }
    return '  ' + cmd.name.pad(nameW).color(style.help.names) +
           trigger.pad(triggerW).color(style.help[cmd.type]) +
           cmd.help;

  });
}


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


function trim(cmd) {
  var trimmer = /^\s*(.+)\s*$/m,
      matches = trimmer.exec(cmd);

  if (matches && matches.length === 2) {
    return matches[1];
  }
}