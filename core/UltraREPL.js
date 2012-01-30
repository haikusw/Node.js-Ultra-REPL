"use strict";

var util  = require('util');
var path  = require('path');
var fs    = require('fs');
var vm    = require('vm');

require('../lib/string-utils').attachTo(String.prototype);

var Commander    = require('./Commander');
var UltraRLI     = require('./UltraRLI');
var Evaluator    = require('./Evaluator');
var Highlighter  = require('./Highlighter');

var Dict         = require('../lib/Dict');
var Results      = require('../lib/PageSet');

var monkeypatch  = require('../lib/monkeypatch');
var builtins     = require('../lib/builtins');

var style        = require('../settings/styling');
var text         = require('../settings/text');

var widest       = require('../lib/string-utils').widest;
var chunk        = require('../lib/string-utils').chunk;


var width = process.stdout._type === 'tty' ? process.stdout.getWindowSize()[0] : 60;

module.exports.UltraREPL = UltraREPL;


function UltraREPL(options){
  var self = this;
  options = options || {};
  options.stream = options.stream || process;

  monkeypatch.typedArrays(global);
  this.settings = {
    columns: width,
    colors: process.stdout._type === 'tty'
  };
  String.prototype.color.context = this.settings;
  var context = this.context = new Evaluator(this.settings);

  this.appPrompt = options.prompt || 'js';
  this.buffered = [];
  this.lines = [];
  this.lines.level = [];
  this.keydisplay = false;

  var stream = {
    input: options.stream.stdin || options.stream,
    output: options.stream.stdout || options.stream,
  };

  //monkeypatch.fixEmitKey(stream.input);

  var complete = function(){};
  var rli = new UltraRLI(stream, complete);

  Object.defineProperties(this, {
    input: hidden(stream.input),
    output: hidden(stream.output),
    rli: hidden(rli)
  });

  rli.on('close', function(){ stream.input.destroy() });
  rli.on('resize', function(){ self.refresh() });
  rli.on('keybind', function(key){
    self.keydisplay && rli.timedWrite('topright', key.bind, style.info.keydisplay);
  });
  rli.on('line', function(cmd){
    if (!cmd || self.commands.keyword(cmd.trim())) return;

    self.buffered.push(cmd);
    self.rli.clearInput();
    clearTimeout(run.timeout);
    run.timeout = setTimeout(run, 20);

    function run(){
      if (!self.buffered.length) return self.updatePrompt();
      context.run(self.buffered.join('\n'), finalize);
    }

    function finalize(result){
      clearTimeout(run.timeout);
      self.writer(result);
      self.resetInput();
    }
  });

  this.commands = new Commander(rli);

  var handler = function(action, cmd, params){
    var result = action.call(self, cmd, params);
    typeof result !== 'undefined' && self.writer(result);
  };

  this.commands.on('keybind', handler);
  this.commands.on('keyword', handler);

  this.context.columns = this.width - 30;
  this.pages = (new Results).bisect(this.height - 2);
  this.updatePrompt();
  this.loadScreen();
}

function header(text, color){
  return (' ' + text).pad(width).color(color);
}


UltraREPL.prototype = {
  constructor: UltraREPL,

  get height(){ return this.rli.height },
  get width(){ return this.rli.width },
  get currentSettings(){ return this.context.current.settings },

  loadScreen: function loadScreen(){
    this.rli.fill();
    this.resetScreen();

    var intro = text.intro.map(function(s){
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
    this.pageLabel();
  },

  displayPrompt: function displayPrompt(){
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
      prompt.push((this.buffered.length + ' buffered').color(style.error));
    }
    prompt = prompt.join(style.prompt.separator[0].color(style.prompt.separator[1]));
    prompt += style.prompt.end[0].color(style.prompt.end[1]);
    this.rli.setPrompt(prompt);
  },

  clear: function clear(){
    var results = new Results;
    this.pages = results.bisect(this.height - 2);
    this.rli.writePage(this.pages[0]);
  },

  format: function format(result){
    var output = [];

    if (result.error) {
      output.push(header(result.error.message, style.errorbg));
      if (result.status === 'SyntaxError') {
        output.push(result.script.code);
      } else {
        var where = result.error.stack.split('\n')[1].split(':');
        var line = where[where.length - 2] - 1;
        var column = where[where.length - 1] - 1;
        output.push(' '+result.script.code.split('\n')[line]+'\n '+' '.repeat(column) + '^');
      }
    }

    if (result.completion) {
      //output.push(header('Result', style.inspector.header));
      output.push(result._completion);
      if (typeof result.completion === 'function') {
        var code = result.completion+'';
        if (code.slice(-17) !== '{ [native code] }') {
          output.push(header('Function Source', style.inspector.header));
          output.push(highlight(code));
        }
      }
    }

    if (result.globals) {
      output.push(header('Globals', style.inspector.header));
      output.push(result._globals);
    }

    if (!output.length) {
      //output.push(header('Result', style.inspector.header));
      output.push(result._completion);
    }

    return output.join('\n\n');
  },

  refresh: function refresh(){
    this.context.current.refresh();
    this.writer(this.context.lastResult);
    this.updatePrompt();
  },

  writer: function writer(output){
    if (output && typeof output === 'object') {
      if (output.isResult) {
        output = this.format(output);
      } else {
        output = this.context.inspector(output);
      }
    }

    var results = new Results(output);
    this.pages = results.bisect(this.height - 2);
    this.pageLabel();
    this.rli.writePage(this.pages[0]);
    this.resetInput();
  },

  get pages(){},
  set pages(v){ Object.defineProperty(this, 'pages', { value: v, writable: true, configurable: true }) },

  pageLabel: function pageLabel(){
    var page = this.pages.length;
    page = page > 1 ? (this.pages.index + 1) + '/' + page : '';
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
    timedPrompt.timer && clearTimeout(timedPrompt.timer);
    timedPrompt.timer = setTimeout(this.updatePrompt.bind(this), time || 5000);
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


function highlight(fn){
  if (typeof fn !== 'function') {
    throw new TypeError('Highlighter needs a function');
  }
  var out = [];
  Highlighter.highlight(fn+'', function(event, val, type){
    if (event === 'line') {
      out.push('\n');
    } else if (event === 'token') {
      if (style && val) {
        val = val.color(style.syntax[type]);
      }
      out.push(val);
    }
  });
  return out.join('');
}


function hidden(v){ return { value: v, configurable: true, writable: true, enumerable: false } };