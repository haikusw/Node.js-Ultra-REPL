require('harmony-collections').attachIfMissing(global);

var util = require('util');
var vm = require('vm');
var path = require('path');
var repl = require('repl');
var REPLServer = repl.REPLServer;

var Dict = require('./Dict');
var Results = require('./Results');
var UltraRLI = require('./UltraRLI');
var Evaluator = require('./Evaluator');

var fixEmitKey = require('./fixEmitKey');

var commands = require('./commands');

var style = require('../settings/styling');
var builtins = require('../settings/builtins');

require('./string-utils').attachTo(String.prototype);
var widest = require('./string-utils').widest;
var chunk = require('./string-utils').chunk;



module.exports.UltraREPL = UltraREPL;


function UltraREPL(options){
  options = options || {};
  var context = this.context = new Evaluator;
  String.prototype.color.context = this.context;

  this.appPrompt = options.prompt || 'js';
  this.buffered = [];
  this.lines = [];
  this.help = [];
  this.lines.level = [];
  this.keydisplay = false;
  this.pages = new Results;

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

  this.commands = new Dict;
  commands(this);

  this.context.columns = this.width - 20;

  this.output.write(' ' + this.help[0].trigger.color(style.help[this.help[0].type]) +
               ' to see command list'.color(style.help.intro));
  this.help = generateHelp(this.help, this.width);
  this.rli.fill();
  this.updatePrompt();
}


UltraREPL.prototype = {
  __proto__: Object.create(REPLServer.prototype),
  constructor: UltraREPL,

  get height(){ return this.rli.height },
  get width(){ return this.rli.width },

  keyword: function keyword(cmd, params){
    if (this.commands.has(cmd)) {
      var result = this.commands[cmd].call(this, cmd, params);
      if (result !== undefined) {
        this.context._ = result;
        this.inspector(this.context._);
      }
      return true;
    }
    return false;
  },

  resetInput: function resetInput(){
    this.buffered = [];
    this.rli.clearInput();
  },

  resetScreen: function resetScreen(){
    this.rli.clearScreen();
    this.rli.clearInput();
  },

  displayPrompt: function displayPrompt(){
    if (this.buffered.length) {
      this.rli.setPrompt('...' + '..'.repeat(this.lines.level.length) + ' ');
    }
    this.rli.clearInput();
  },

  showHelp: function showHelp(){
    this.rli.clearScreen();
    this.rli.writeFrom(this.help);
    this.resetInput();
  },

  updatePrompt: function updatePrompt(){
    var prompt = [this.appPrompt];
    if (this.context.count > 1) {
      prompt.push((this.context.index + 1 + '').color(style.prompt.number) + ' ' + this.context.name);
    }
    if (this.messages) {
      prompt.push(this.messages);
      this.messages = null;
    }
    prompt = prompt.join(style.prompt.separator[0].color(style.prompt.separator[1]));
    prompt += style.prompt.end[0].color(style.prompt.end[1]);
    this.rli.setPrompt(prompt);
  },

  clear: function clear(){
    var results = new Results;
    this.pages = results.bisect(this.height - 1);
    this.rli.writePage(this.pages.get(0));
  },

  refresh: function refresh(){
    this.inspector();
  },

  inspector: function inspector(obj){
    var output = this.context._;
    if (typeof obj === 'string') {
      output = obj;
    } else if (typeof obj === 'object') {
      output = this.context._ = obj;
    }
    var results = new Results(output);

    this.pages = results.bisect(this.height - 1);

    this.rli.writePage(this.pages.get(0));
    this.pageLabel();
    this.resetInput();
  },

  pageLabel: function pageLabel(){
    var page = (this.pages.iterator.current + 1) + '/' + this.pages.count();
    this.rli.writeMount('topcenter', page.color(style.info.page));
  },

  timedPrompt: function timedPrompt(message, color, time){
    this.messages = message.color(color);
    this.updatePrompt();
    clearTimeout(this.timer);
    this.timer = setTimeout(this.updatePrompt.bind(this), time || 5000);
  },

};

function generateHelp(help, screenW){
  var nameW = widest(help, 'name') + 2;
  var triggerW = widest(help, 'trigger') + 2;
  var helpL = nameW + triggerW + 2;
  var helpR = screenW - nameW - triggerW - 8;
  return help.map(function(cmd){
    var trigger = cmd.trigger || '';
    if (cmd.type === 'keywords') {
      cmd.help += '\n' + chunk(', ', helpR, helpL + 2, trigger).color(style.help.keywords);
      trigger = '';
    } else {
      cmd.help = cmd.help.align(helpR, helpL);
    }
    return '  ' + cmd.name.pad(nameW).color(style.help.names) +
           trigger.pad(triggerW).color(style.help[cmd.type]) +
           cmd.help;

  });
}