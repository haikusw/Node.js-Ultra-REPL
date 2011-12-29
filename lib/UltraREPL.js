require('harmony-collections').attachIfMissing(global);

var util = require('util');
var vm = require('vm');
var path = require('path');
var repl = require('repl');
var REPLServer = repl.REPLServer;

var commands = require('./commands');
var builtins = require('./builtins');
var Iterable = require('./Iterable');
var REPLContext = require('./REPLContext');

var colors = require('./utilities').color;
var __ = require('./utilities').descriptor;
var ansilength = require('./utilities').ansilength;
var margins = require('./utilities').margins;
//var ui = require('./ui');

module.exports.UltraREPL = UltraREPL;


function UltraREPL(prompt){
  this.bufferedCommand = '';
  this.contexts = new Iterable;
  this.settings = new REPLContext(true);
  this.iterator =  this.contexts.__iterator__();
  this.contexts.add('global', this.settings);
  this.context = global;
  this.prompts.main = prompt || 'js';
  REPLServer.call(this, 'global', null, this.evaler, true);
  this.useGlobal = false;
  repl.writer = this.writer.bind(this);

  var mods = [ '', 'ctrl+', 'alt+', 'ctrl+alt+', 'shift+',
               'ctrl+shift+', 'alt+shift+', 'ctrl+alt+shift+' ];

  this.keywords = new Map;
  this.keybinds = new Map;
  this.commands = {};
  this.help = [];

  this.rli.input.on('keypress', function(line, key){
    if (!key) return;
    var keybind = mods[key.ctrl | key.meta << 1 | key.shift << 2] + key.name;
    if (this.keybinds.has(keybind)) {
      this.keybinds.get(keybind).call(this, line);
    }
  }.bind(this));

  commands(this);
  //ui(this);
  this.print([this.help[0].activation + ' to see command list', 'bgreen'])
  this.clear(-1);
}

util.inherits(UltraREPL, REPLServer);


UltraREPL.prototype = Object.create(REPLServer.prototype, {
  constructor: __(UltraREPL),

  evaler: __(function evaler(code, context, file, cb){
    var handled = this.keywordInterceptor(code);
    if (handled) return cb(err, handled);
    var err, result;
    try {
      result = !this.iterator.current ? vm.runInThisContext(code, file)
                                     : vm.runInContext(code, this.context, file);
    } catch (e) {
      err = e;
    }
    cb(err, result);
  }),

  print: __(function print(text, color){
    if (Array.isArray(text)) {
      this.rli.output.clearLine();
      this.rli.output.cursorTo(0);
      [].slice.call(arguments).forEach(function(s){
        if (s && s.length) {
          this.print.call(this, s[0] + ' ', s[1]);
        }
      }, this);
      return;
    }
    if (color && this.settings.colors) {
      text = colors(text, color);
    }
    this.outputStream.write(text);
  }),

  clear: __(function clear(minus){
    this.print(Array(this.rli.output.getWindowSize()[1] + 1 + Number(minus)).join('\n'));
    this.displayPrompt();
  }),

  displayPrompt: __(function displayPrompt() {
    if (this.bufferedCommand.length) {
      this.rli.setPrompt('...' + new Array(this.lines.level.length).join('..') + ' ');
    } else {
      this.updatePrompt();
    }
    this.rli.prompt();
  }),

  keywordInterceptor: __(function keywordInterceptor(cmd){
    cmd = cmd.replace(/^\(|\n\)$/g, '');
    if (this.keywords.has(cmd)) {
      return this.context._ = this.keywords.get(cmd).call(this, cmd);
    }
  }),

  showHelp: __(function showHelp(){
    var max = this.help.reduce(function(a, b){
      return a > b.name.length ? a : b.name.length;
    }, 0) + 2;

    this.print([this.help.map(function(command){
      return margins(max, colors(command.name, 'cyan')) +
             margins(max, colors(command.activation, this.typeColors[command.type])) +
             command.help;
    }.bind(this)).join('\n')]);
    this.clear(-this.help.length);
    this.displayPrompt();
  }),

  typeColors: __({
    keybind: 'yellow',
    command: 'green',
    keyword: 'magenta'
  }),

  prompts: __({
    main: 'js',
    separator: colors(' \u25ca ', 'green'),
    end: colors(' \u00BB ', 'cyan')
  }),

  updatePrompt: __(function updatePrompt(){
    var prompt = [this.prompts.main];
    if (this.contexts.count() > 1) {
      prompt.push(colors((this.iterator.current + 1) + '/' + this.contexts.count(), 'yellow'));
      prompt.push(colors(this.settings.name, this.settings.color));
    }
    if (this.messages) {
      prompt.push(this.messages);
      this.messages = null;
    }
    prompt = prompt.join(this.prompts.separator) + this.prompts.end;
    this.rli.setPrompt(prompt, ansilength(prompt));
    this.rli._refreshLine();
  }),

  writer: __(function writer(obj){
    return this.context._;
  }),

  timedMessage: __(function timedMessage(message, color, time){
    if (color && this.settings.colors) {
      message = colors(message, color);
    }

    this.messages = message;
    this.updatePrompt();

    clearTimeout(this.timer);
    this.timer = setTimeout(this.updatePrompt.bind(this), time || 5000);
   }),

  createContext: __(function createContext(){
    var context = new REPLContext;
    this.contexts.add(context.name, context);
    this.changeContext(this.contexts.count() - 1);
    this.context = context.ctx;
    this.timedMessage('++created', 'green')
  }),

  changeContext: __(function changeContext(to, silent){
    this.lines = [];
    this.lines.level = [];

    var info = this.iterator.advance(to);

    if (info && this.context === info.ctx) {
      return this.timedMessage('no contexts', 'bred');
    }

    this.settings = info;
    this.context = info.ctx;

    if (!silent) {
      this.updatePrompt();
    }
  }),

  deleteContext: __(function deleteContext(){
    if (this.iterator.current === 0) {
      return this.timedMessage('not deletable', 'bred');
    }

    var info = this.iterator.getCurrent();
    this.contexts.remove(this.iterator.current);
    this.changeContext(this.iterator.current, true);

    this.timedMessage('--deleted ' + colors(info.name, info.color), 'red');
  }),

  resetContext: __(function resetContext(force) {
    if (this.context === global) return;
    for (var i in require.cache) {
      delete require.cache[i];
    }
    this.context = this.settings.initialize();
    this.timedMessage('reset', 'magenta');
  })
});