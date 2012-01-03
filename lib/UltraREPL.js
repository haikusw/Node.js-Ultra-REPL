require('harmony-collections').attachIfMissing(global);

var util = require('util');
var vm = require('vm');
var path = require('path');
var repl = require('repl');
var fs = require('fs');
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
  rli.on('resize', this.refresh.bind(this));
  rli.on('line', function(cmd){
    cmd = cmd.trim();
    if (!cmd || this.keyword(cmd) !== false) return;

    this.buffered.push(cmd);
    this.rli.clearInput();
    this.updatePrompt();
    clearTimeout(run.timeout);
    run.timeout = setTimeout(run.bind(this), 50);

    function run(){
      if (!this.buffered.length) return;
      var evaled = context.evaluate(this.buffered.join('\n'));
      if (evaled.status === 'syntax error') {
        if (!finalize.errored) {
          this.timedPrompt(evaled, style.error);
          finalize.errored = true;
        }
        return;
      }
      finalize.call(this, evaled);
    }

    function finalize(evaled){
      finalize.errored = false;
      this.inspector(evaled.status === 'success' ? evaled.output : evaled.result.stack);
      this.resetInput();
    }
  }.bind(this));

  commands(this);
  this.context.columns = this.width - 20;
  this.updatePrompt();
  this.loadScreen();
  this.help = generateHelp(this.help, this.width);
  this.pages = (new Results).bisect(this.height - 1);
}


UltraREPL.prototype = {
  __proto__: Object.create(REPLServer.prototype),
  constructor: UltraREPL,

  get height(){ return this.rli.height },
  get width(){ return this.rli.width },

  loadScreen: function loadScreen(){
    this.rli.fill();
    this.resetScreen();

    var intro = require('../settings/text').intro.map(function(s){
      return s[0].color(style.intro[0]) + ' ' + s[1].color(style.intro[1]);
    });

    var seehelp = [ 'press'.color(style.help.intro),
                    this.help[0].trigger.color(style.help[this.help[0].type]),
                    'to see command list'.color(style.help.intro) ].join(' ');

    seehelp = ' '.repeat((intro[0].alength - seehelp.alength) / 2 | 0) + seehelp;
    intro.push('', seehelp);

    this.rli.writeFrom(intro, (this.height - 4 - intro.length) / 2 | 0, (this.width - intro[0].alength) / 2 | 0);

  },

  keyword: function keyword(cmd){
    var m = cmd.match(/^([^\s]+)\s+(.*)$/);
    if (m !== null && this.commands.has(m[1])) {
      var result = this.commands[m[1]].call(this, cmd, m[2]);
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
    this.updatePrompt();
  },

  resetScreen: function resetScreen(){
    this.rli.clearScreen();
    this.resetInput();
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
    if (this.buffered.length) {
      prompt.push((this.buffered.length + ' buffered').color('bred'));
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