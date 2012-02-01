"use strict";

var str = require('../lib/string-utils');
str.attachTo(String.prototype);

var Commander    = require('./Commander');
var UltraRLI     = require('./UltraRLI');
var Evaluator    = require('./Evaluator');
var Highlighter  = require('./Highlighter');
var Results      = require('./Results');

var Dict         = require('../lib/Dict');

var monkeypatch  = require('../lib/monkeypatch');
var builtins     = require('../lib/builtins');

var style        = require('../settings/styling');
var text         = require('../settings/text');


var width = process.stdout._type === 'tty' ? process.stdout.getWindowSize()[0] : 60;

module.exports = UltraREPL;


function UltraREPL(options){
  var self = this;
  options = options || {};
  options.stream = options.stream || process;

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

  var complete = function(){};
  var rli = new UltraRLI(stream, complete);
  var pages;

  Object.defineProperties(this, {
    input: hidden(stream.input),
    output: hidden(stream.output),
    rli: hidden(rli),
    pages: {
      configurable: true,
      get: function( ){ return pages },
      set: function(v){ pages = v.bisect(this.height - 2) }
    }
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
      clearTimeout(run.timeout);
      if (!self.buffered.length) return self.updatePrompt();
      context.run(self.buffered.join('\n'), finalize);
      self.buffered = [];
    }

    function finalize(result){
      clearTimeout(run.timeout);
      self.writer(result);
      self.resetInput();
    }
  });

  this.commands = new Commander(rli);

  var handler = function(action, cmd, params){
    var context = self.context.current;
    context.snapshot();
    var outcome = action.call(self, cmd, params);
    var globals = context.snapshot();
    if (typeof outcome !== 'undefined' || globals && Object.keys(globals).length) {
      if (outcome && outcome.isResult) {
        result = outcome;
      } else if (outcome && outcome.error) {
        var result = new Results.Fail(context, null, outcome.error);
      } else {
        var result = new Results.Success(context, null, outcome, globals);
      }
      self.writer(result);
      self.resetInput();
      return result;
    }
    context.refresh();
  }

  this.commands.on('keybind', handler);
  this.commands.on('keyword', handler);

  this.pages = new Results.Rendered;
  this.loadScreen();
  this.header();
  this.updatePrompt();
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
    this.rli.clearScreen();

    var intro = text.intro.map(function(s){
      return s[0].color(style.intro[0]) + ' ' + s[1].color(style.intro[1]);
    });

    var seehelp = [ 'press'.color(style.help.intro),
                    this.commands.help[0].trigger.color(style.help[this.commands.help[0].type]),
                    'to see command list'.color(style.help.intro) ].join(' ');

    seehelp = ' '.repeat((intro[0].alength - seehelp.alength) / 2 | 0) + seehelp;
    intro.push('', seehelp);

    this.rli.writeFrom(intro, (this.width - intro[0].alength) / 2 | 0, (this.height - 2 - intro.length) / 2 | 0);
  },

  resetInput: function resetInput(){
    this.buffered = [];
    this.rli.clearInput();
  },

  resetScreen: function resetScreen(){
    this.rli.clearScreen();
    this.header();
    this.rli.refreshLine();
  },

  displayPrompt: function displayPrompt(){
    this.rli.clearInput();
  },

  showHelp: function showHelp(info){
    this.resetScreen();
    this.writer(this.generateHelp(info || this.commands.help, this.width));
  },

  updatePrompt: function updatePrompt(){
    var prompt = [this.appPrompt];
    if (this.context.count) {
      prompt.push((this.context.index + 1 + '').color(style.prompt.number) + ' ' + this.context.displayName);

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
    this.pages = new Results.Rendered;
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

    if (result.globals) {
      output.push(header('Globals', style.inspector.header));
      output.push(result._globals);
    }

    if (result.completion) {
      if (result.globals) output.push(header('Result', style.inspector.header));
      output.push(result._completion);
      if (typeof result.completion === 'function') {
        var code = result.completion+'';
        if (code.slice(-17) !== '{ [native code] }') {
          output.push(header('Function Source', style.inspector.header));
          output.push(highlight(code));
        }
      }
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
    if (output instanceof Results.Rendered) {
      this.pages = output;
    } else {
      if (output && typeof output === 'object') {
        if (output.isResult) {
          output = this.format(output);
        } else {
          output = this.context.inspector(output);
        }
      }
      this.pages = new Results.Rendered(output);
    }

    this.rli.writePage(this.pages[0]);
    this.header();
    this.updatePrompt();
  },

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
    clearTimeout(timedPrompt.timer);
    timedPrompt.timer = setTimeout(this.updatePrompt.bind(this), time || 5000);
  },

  generateHelp: function generateHelp(help, screenW){
    var nameW = str.widest(help, 'name') + 2;
    var triggerW = str.widest(help, 'trigger') + 2;
    var helpL = nameW + triggerW + 2;
    var helpR = screenW - nameW - triggerW - 8;
    var last = 0;
    return new Results.Rendered(help.filter(function(cmd){ return cmd.help }).reduce(function(lines, cmd){
      var out = {
        help: cmd.help.color((last ^= 1) ? 'bwhite' : 'bblack'),
        type: cmd.type,
        trigger: cmd.trigger || '',
        name: ' ' + cmd.name
      };

      if (out.type === 'keywords') {
        out.help += '\n' + str.chunk(', ', helpR, helpL + 2, out.trigger).color(style.help.keywords);
        out.trigger = '';
      } else {
        out.help = out.help.align(helpR, helpL);
      }
      out = out.name.pad(nameW).color(style.help.names) +
            out.trigger.pad(triggerW).color(style.help[out.type]) +
            out.help;

      lines.push.apply(lines, out.split('\n'));
      return lines;
    }, []));
  }
};


function highlight(fn){
  if (typeof fn === 'function') fn = fn + '';
  if (typeof fn !== 'string') {
    throw new TypeError('Highlighter needs a function or string');
  }
  var out = [];
  Highlighter.highlight(fn, function(event, val, type){
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

