"use strict";
require('harmony-collections').attachIfMissing(global);

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



module.exports.UltraREPL = UltraREPL;


function UltraREPL(options){
  var self = this;
  options = options || {};
  options.stream = options.stream || process;

  monkeypatch.typedArrays(global);
  var context = this.context = new Evaluator;
  String.prototype.color.context = context;

  this.appPrompt = options.prompt || 'js';
  this.buffered = [];
  this.lines = [];
  this.lines.level = [];
  this.keydisplay = false;

  var stream = {
    input: options.stream.stdin || options.stream,
    output: options.stream.stdout || options.stream,
  };

  monkeypatch.fixEmitKey(stream.input);

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
      var evaled = context.evaluate(self.buffered.join('\n'), finalize);
      if (evaled.status === 'syntax_error') {
        if (!finalize.errored) {
          evaled.completion && self.timedPrompt(evaled.completion.name);
          finalize.errored = true;
        }
        clearTimeout(finalize.syntax);
        if (evaled.completion) {
          finalize.syntax = setTimeout(function(){
            finalize(evaled);
          }, 500);
        }
        return self.updatePrompt();
      }
    }

    function finalize(evaled){
      finalize.errored = false;
      clearTimeout(finalize.syntax);

      var output = [], header, content;

      if (evaled.status === 'error' || evaled.status === 'syntax_error') {
        output.push((' '+evaled.completion.message).pad(self.width).color(style.errorbg));
        if (evaled.status === 'error') {
          var where = evaled.completion.stack.split('\n')[1].split(':');
          where = {
            line: where[where.length - 2] - 1,
            col: where[where.length - 1] - 1
          };
          output.push(' '+self.buffered[where.line]+'\n '+' '.repeat(where.col) + '^');
        } else {
          output.push(self.buffered.join('\n'));
        }
      } else {

        if (evaled.completion) {

          if (typeof evaled.completion === 'string') {
            evaled.text = evaled.completion;
          } else {
            self.context._ = evaled.completion;
            output.push(' Result'.pad(self.width).color(style.inspector.header), self.context._);
            if (typeof evaled.completion === 'function' && (evaled.completion+'').slice(-17) !== '{ [native code] }') {
              output.push(' Function Source'.pad(self.width).color(style.inspector.header), highlight(evaled.completion));
            }
          }
        }

        if (evaled.globals && Object.keys(evaled.globals).length) {
          self.context._ = evaled.globals;
          output.push(' New Globals'.pad(self.width).color(style.inspector.header), self.context._);
        }

        if (evaled.text) {
          output.push(' Text'.pad(self.width).color(style.inspector.header), evaled.text.color(style.inspector.String));
        }
      }

      if (!output.length) {
        self.context._ = evaled;
        output.push(self.context._);
      }

      self.inspector(output.join('\n\n'));

      self.resetInput();
    }
  });

  this.commands = new Commander(rli);

  var handler = function(action, cmd, params){
    var result = action.call(self, cmd, params);
    typeof result !== 'undefined' && self.inspector(result);
  };

  this.commands.on('keybind', handler);
  this.commands.on('keyword', handler);

  this.context.columns = this.width - 30;
  this.pages = (new Results).bisect(this.height - 2);
  this.updatePrompt();
  this.loadScreen();
}


UltraREPL.prototype = {
  constructor: UltraREPL,

  get height(){ return this.rli.height },
  get width(){ return this.rli.width },

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
    this.pageLabel();
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