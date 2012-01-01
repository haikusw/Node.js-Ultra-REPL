require('harmony-collections').attachIfMissing(global);

var util = require('util');
var vm = require('vm');
var path = require('path');
var repl = require('repl');
var REPLServer = repl.REPLServer;

var commands = require('./commands');
var UltraRLI = require('./UltraRLI');
var Evaluator = require('./Evaluator');
var Iterable = require('./Iterable').Iterable;
var IterableIterator = require('./Iterable').IterableIterator;

var fixEmitKey = require('./fixEmitKey');


var style = require('../settings/styling');
var builtins = require('../settings/builtins');

require('./string-utils').attachTo(String.prototype);

var __ = require('./object-utils').descriptor;
var widest = require('./string-utils').widest;
var chunk = require('./string-utils').chunk;


module.exports.UltraREPL = UltraREPL;

Array.isArray = (function(oldIsArray){
  return function isArray(arr){
    if (oldIsArray(arr) === true) return true;
    if (Object(arr) === arr && Object.getPrototypeOf(arr) === Page.prototype) return true;
    return false;
  }
})(Array.isArray);

var classes = new Map;

Object.prototype.toString = (function(oldToString){
  return function toString(obj){
    var proto = Object.getPrototypeOf(Object(this));
    if (classes.has(proto)) {
      return '[object ' + classes.get(proto).name + ']';
    } else {
      return oldToString.call(this);
    }
  }
})(Object.prototype.toString);


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
  this.pages = new PageSet;

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

  this.context.columns = this.width - 20;

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
    var results = new Results(output);

    this.pages = results.bisect(this.height - 1);

    //this.rli.writeFrom(output);
    this.rli.writeFrom(this.pages.get(0), 0);
    this.pageLabel();
    this.resetInput();
  }),

  pageLabel: __(function pageLabel(){
    var page = (this.pages.iterator.current + 1) + '/' + this.pages.count();
    this.rli.writeMount('topcenter', page.color(style.info.page));
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


function Page(contents){
  if (typeof contents === 'string') {
    contents = contents.split(/\r\n|\n|\r/);
  }
  Array.call(this);
  this.push.apply(this, contents)
}

Page.prototype = Object.defineProperties([], {
  constructor: __(Page),
  toString: __(function toString(){ return this.join('\n') }, true),
});

classes.set(Page.prototype, Page);

function Results(input){
  if (typeof input === 'string') {
    this.contents = input.split(/\r\n|\n|\r/);
  } else if (Array.isArray(input)) {
    this.contents = input;
  }
  PageSets.set(this, []);
}

var PageSets = new WeakMap;

Results.prototype = Object.create(Iterable.prototype, {
  constructor: __(Results),
  bisect: __(function bisect(divisor){
    var cached = PageSets.get(this)[divisor];
    if (cached) return cached;
    var pages = new PageSet;
    var chunks = this.contents.length / divisor + 1 | 0;
    for (var i = 0; i < chunks; i++) {
      var lines = this.contents.slice(i * divisor, (i + 1) * divisor);
      var page = new Page(lines);
      if (page.length < divisor) {
        page.push.apply(page, Array(divisor - page.length).join(' ').split(' '));
      }
      pages.add(i, page);
    }
    PageSets.get(this)[divisor] = pages;
    return pages;
  })
});


function PageSet(){
  Iterable.call(this);
  this.iterable = this;
  this.iterator = this.__iterator__();
}

PageSet.prototype = Object.create(Iterable.prototype);

Object.getOwnPropertyNames(IterableIterator.prototype).forEach(function(prop){
  if (typeof IterableIterator.prototype[prop] === 'function') {
    PageSet.prototype[prop] = function(){ return this.iterator[prop].apply(this.iterator, arguments) }
  }
}, this)

//Object.getOwnPropertyNames(IterableIterator.prototype).forEach(function(prop){
//  Object.defineProperty(PageSet.prototype, prop, Object.getOwnPropertyDescriptor(IterableIterator.prototype, prop));
//})
