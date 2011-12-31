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



function UltraREPL(options){
  options = options || {};

 var context = this.context = new Evaluator;
  notifier(this.context, ['create', 'change', 'remove', 'reset', 'error'], this.alertHandler, this);

  String.prototype.color.context = this.context;

  this.appPrompt = options.prompt || 'js';
  this.commands = new Map;
  this.help = [];
  this.buffered = [];
  this.lines = [];
  this.lines.level = [];


  var stream = initStream(options.stream);
  this.input = stream.input;
  this.output = stream.output;
  fixEmitKey(this.input);


  var complete = this.complete.bind(this);
  var rli = this.rli = new UltraRLI(stream, complete);


  rli.on('close', stream.input.destroy.bind(stream.input));

  rli.on('line', function(cmd){
    cmd = trim(cmd);
    if (!cmd) return

    if (this.keyword(cmd) !== false) return;

    var m = cmd.match(/^([^\s]+)\s+(.*)$/);
    if (m !== null && this.keyword(m[1], m[2]) !== false) return

    this.buffered.push(cmd);
    var evaled = context.evaluate(this.buffered.join('\n'));

    if (evaled.status === 'success') {
      this.buffered = []
      this.inspector(evaled.output);
    } else if (evaled.status === 'error') {
      this.buffered = []
      this.inspector(evaled.result.stack);
    } else if (evaled.status === 'syntax error') {
      this.context._ = evaled;
      this.inspector();
    }

  }.bind(this));

  commands(this);

  this.context.columns = this.width;

  this.output.write(' ' + this.help[0].activation.color(style.help[this.help[0].type]) +
               ' to see command list'.color(style.help.intro));
  this.help = generateHelp(this.help, this.width);
  this.rli.fill();
  this.updatePrompt(true);
  this.rli.clearInput();
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

  height: __(function getter(){
    var val = this.output.getWindowSize()[1];
    Object.defineProperty(this, 'height', { value: val, enumerable: true });
    return val;
  }),

  width: __(function getter(){
    var val = this.output.getWindowSize()[0];
    Object.defineProperty(this, 'width', { value: val, enumerable: true });
    return val;
  }),

  resetInput: __(function resetInput(){
    this.buffered = [];
    this.rli.clearInput();
  }),

  resetScreen: __(function resetScreen(){
    this.rli.clearScreen();
    this.rli.clearInput();
  }),

  displayPrompt: __(function displayPrompt() {
    this.output.cursorTo(0, this.height);
    if (this.buffered.length) {
      this.rli.setPrompt('...' + new Array(this.lines.level.length).join('..') + ' ');
    } else {
      this.updatePrompt();
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
    this.rli.setPrompt(prompt, prompt.alength);
    !dontRefresh && this.rli._refreshLine();
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

function generateHelp(help, screenWidth){
  var nameWidth = maxLength(help, 'name') + 2;
  var activWidth = maxLength(help, 'activation') + 2;
  var descLeft = nameWidth + activWidth;
  var descRight = screenWidth - nameWidth - activWidth - 5;
  return help.map(function(cmd){
    var act = cmd.activation;
    if (cmd.type === 'keywords') {
      cmd.help += '\n' + chunk(', ', descRight, descLeft + 3, act).color(style.help.keywords);
      act = '';
    } else {
      cmd.help = cmd.help.align(descRight, descLeft + 1);
    }
    return ' ' + cmd.name.margin(nameWidth).color(style.help.names) +
           act.margin(activWidth).color(style.help[cmd.type]) +
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