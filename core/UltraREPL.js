require('harmony-collections').attachIfMissing(global);

var util = require('util');
var vm = require('vm');
var path = require('path');
var repl = require('repl');
var fs = require('fs');
var REPLServer = repl.REPLServer;

require('../lib/string-utils').attachTo(String.prototype);
var Dict = require('../lib/Dict');
var Results = require('../lib/PageSet');
var Commander = require('./Commander');
var UltraRLI = require('./UltraRLI');
var Evaluator = require('./Evaluator');

var fixEmitKey = require('../lib/fixEmitKey');


var style = require('../settings/styling');
var builtins = require('../lib/builtins');

var widest = require('../lib/string-utils').widest;
var chunk = require('../lib/string-utils').chunk;



module.exports.UltraREPL = UltraREPL;


function UltraREPL(options){
  options = options || {};
  var context = this.context = new Evaluator;
  String.prototype.color.context = this.context;

  this.appPrompt = options.prompt || 'js';
  this.buffered = [];
  this.lines = [];
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

  fixEmitKey(stream.input);

  var complete = this.complete.bind(this);
  var rli = new UltraRLI(stream, complete);

  Object.defineProperties(this, {
    input: hidden(stream.input),
    output: hidden(stream.output),
    rli: hidden(rli),
    timer: hidden(0)
  });

  rli.on('close', stream.input.destroy.bind(stream.input));
  rli.on('resize', this.refresh.bind(this));
  rli.on('keybind', function(key){
    this.keydisplay && rli.timedWrite('topright', key.bind, style.info.keydisplay);
  }.bind(this));
  rli.on('line', function(cmd){
    cmd = cmd.trim();
    if (!cmd || this.commands.keyword(cmd)) return;

    this.buffered.push(cmd);
    this.rli.clearInput();
    clearTimeout(run.timeout);
    run.timeout = setTimeout(run.bind(this), 20);

    function run(){
      if (!this.buffered.length) return this.updatePrompt();
      var evaled = context.evaluate(this.buffered.join('\n'), finalize.bind(this));
      if (evaled.status === 'syntax_error') {
        if (!finalize.errored) {
          this.timedPrompt(evaled.result.name);
          finalize.errored = true;
        }
        clearTimeout(finalize.syntax);
        finalize.syntax = setTimeout(finalize.bind(this, evaled), 500);
        return this.updatePrompt();
      }
    }

    function finalize(evaled){
      finalize.errored = false;
      clearTimeout(finalize.syntax);
      this.inspector(evaled.result);
      this.resetInput();
    }
  }.bind(this));

  this.commands = new Commander(rli);

  var handler = function(action, cmd, params){
    var result = action.call(this, cmd, params);
    typeof result !== 'undefined' && this.inspector(result);
  }.bind(this);

  this.commands.on('keybind', handler);
  this.commands.on('keyword', handler);

  this.context.columns = this.width - 10;
  this.pages = (new Results).bisect(this.height - 2);
  this.updatePrompt();
  this.loadScreen();
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
                    this.commands.help[0].trigger.color(style.help[this.commands.help[0].type]),
                    'to see command list'.color(style.help.intro) ].join(' ');

    seehelp = ' '.repeat((intro[0].alength - seehelp.alength) / 2 | 0) + seehelp;
    intro.push('', seehelp);

    this.rli.writeFrom(intro, (this.width - intro[0].alength) / 2 | 0, (this.height - 2 - intro.length) / 2 | 0);
    this.header();
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

  showHelp: function showHelp(info){
    this.rli.clearScreen();
    this.header();
    this.rli.writeFrom(this.generateHelp(info || this.commands.help, this.width));
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
    this.pages = results.bisect(this.height - 2);
    this.rli.writePage(this.pages.get(0));
  },

  refresh: function refresh(){
    this.inspector();
    this.updatePrompt();
  },

  inspector: function inspector(obj){
    if (obj) {
      if (typeof obj === 'string') {
        var output = obj;
      } else {
        this.context._ = obj;
        var output = this.context._;
      }
    } else {
      var output = this.context._;
    }

    var results = new Results(output);
    this.pages = results.bisect(this.height - 2);
    this.rli.writePage(this.pages.get(0));
    this.resetInput();
  },

  pageLabel: function pageLabel(){
    var page = this.pages.count();
    page = page > 1 ? (this.pages.iterator.current + 1) + '/' + page : '';
    this.rli.writeMount('topcenter', page.color(style.info.page), style.info.header);
  },

  header: function header(){
    this.output.cursorTo(0, 0);
    this.output.write(' '.repeat(this.width).color(style.info.header));
    this.pageLabel();
    this.rli.toCursor();
  },

  timedPrompt: function timedPrompt(message, color, time){
    this.messages = message.color(color);
    this.updatePrompt();
    clearTimeout(this.timer);
    this.timer = setTimeout(this.updatePrompt.bind(this), time || 5000);
  },
  generateHelp: function generateHelp(help, screenW){
    var nameW = widest(help, 'name') + 2;
    var triggerW = widest(help, 'trigger') + 2;
    var helpL = nameW + triggerW + 2;
    var helpR = screenW - nameW - triggerW - 8;
    var last = 0;
    return help.filter(function(cmd){ return cmd.help }).map(function(cmd){
      var output = {
        help: cmd.help.color((last ^= 1) ? 'bwhite' : 'bblack'),
        type: cmd.type,
        trigger: cmd.trigger || '',
        name: cmd.name
      };

      if (output.type === 'keywords') {
        output.help += '\n' + chunk(', ', helpR, helpL + 2, output.trigger).color(style.help.keywords);
        output.trigger = '';
      } else {
        output.help = output.help.align(helpR, helpL);
      }
      return '  ' + output.name.pad(nameW).color(style.help.names) +
             output.trigger.pad(triggerW).color(style.help[output.type]) +
             output.help;

    });
  }
};



function hidden(v){ return { value: v, configurable: true, writable: true, enumerable: false } };