var util = require('util');
var vm = require('vm');
var path = require('path');
var repl = require('repl');
var REPLServer = repl.REPLServer;

var colors = require('./colors');
var commands = require('./commands');
var keybinds = require('./keybinds');
var builtins = require('./builtins');
var Iterable = require('./Iterable');
var REPLContext = require('./REPLContext');


module.exports.UltraREPL = UltraREPL;


function UltraREPL(){
  this.contexts = new Iterable;
  this.iterator =  this.contexts.__iterator__();
  this.contexts.add('global', new REPLContext(true));
  this.context = global;
  this.mainPrompt = colors('node', 'bblack');
  REPLServer.call(this, 'global', null, this.evaler, true);
  this.useGlobal = false;
  keybinds(this);
  commands(this);

  repl.writer = this.writer.bind(this);
  process.repl = this;
}

util.inherits(UltraREPL, REPLServer);


UltraREPL.prototype = Object.create(REPLServer.prototype, {
  constructor: __(UltraREPL),

  evaler: __(function evaler(code, context, file, cb){
    var err, result, lib = this.builtinLib(code, context);
    if (lib) return cb(err, lib);
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
      [].slice.call(arguments).forEach(function(s){
        if (s && s.length) {
          this.print.call(this, s[0] + ' ', s[1]);
        }
      }, this);
      this.outputStream.write('\n');
      return this.displayPrompt();
    }
    if (color && this.iterator.getCurrent().useColors) {
      text = colors(text, color);
    }
    this.outputStream.write(text);
  }),

  displayPrompt: __(function displayPrompt() {
    if (this.bufferedCommand.length) {
      this.rli.setPrompt('...' + new Array(this.lines.level.length).join('..') + ' ');
    } else {
      this.updatePrompt();
    }
    this.rli.prompt();
  }),

  builtinLib: __(function builtinLib(cmd, context){

    // Check if a builtin module name was used and then include it
    // if there's no conflict.
    cmd = cmd.replace(/^\(|\n\)$/g, '');
    if (~builtins.libs.indexOf(cmd)) {
     var lib = require(cmd);
     if (cmd in this.context && lib !== this.context[cmd]) {
       this.print(['A different "' + cmd + '" already exists globally', 'bred']);
     } else {
       return context[cmd] = context._ = lib;
     }
    }
  }),

  updatePrompt: __(function updatePrompt(){
    var sep = colors(' \u25ca ', 'green');
    var prompt = colors(this.mainPrompt, 'bwhite') + sep
    if (this.contexts.count() > 1) {
      prompt += colors((this.iterator.current + 1) + '/' + this.contexts.count(), 'yellow') + sep;
    }
    var info = this.iterator.getCurrent();
    prompt += colors(info.name, info.color);
    if (this.messages) {
      prompt += sep + this.messages;
      this.messages = null;
    }
    prompt += colors(' \u00BB ', 'cyan');
    this.rli.setPrompt(prompt, prompt.replace(/\033\[(?:[12]2?;)?3\dm/g, '').length);
    this.rli._refreshLine();
  }),

  writer: __(function writer(obj){
    return this.context._ + '\n';
  }),

  changeContext: __(function changeContext(to, silent){
    this.lines = [];
    this.lines.level = [];

    var info = this.iterator.advance(to);

    if (this.context === info.ctx) {
      return this.timedMessage('no contexts', 'bred');
    }

    this.context = info.ctx;

    if (!silent) this.updatePrompt();
  }),

  nextContext: __(function nextContext(){
    this.changeContext(1);
  }),

  prevContext: __(function prevContext(){
    this.changeContext(-1);
  }),

  timedMessage: __(function showError(message, color, time){
    if (color && this.iterator.getCurrent().useColors) {
      message = colors(message, color);
    }
    this.messages = message;
    this.updatePrompt();
    clearTimeout(this.timer);
    this.timer = setTimeout(function(){ this.updatePrompt() }.bind(this), time || 5000);
   }),

  deleteContext: __(function deleteContext(){
    if (this.iterator.current === 0) {
      return this.timedMessage('not deletable', 'bred');
    }

    var info = this.iterator.getCurrent();
    this.contexts.remove(this.iterator.current);
    this.changeContext(this.iterator.current, true);

    this.timedMessage(colors('--deleted ' + colors(info.name, info.color), 'red'));
  }),

  resetContext: __(function resetContext(force) {
    if (this.context === global) return;
    for (var i in require.cache) {
      delete require.cache[i];
    }
    this.context = this.iterator.getCurrent().initialize();
  }),

  createContext: __(function createContext(){
    var context = new REPLContext;
    this.contexts.add(context.name, context);
    this.changeContext(this.contexts.count() - 1);
    this.context = context.ctx;
    this.timedMessage('++created', 'green')
  })
});


function __(val, h, r){
  var d = { configurable: true, enumerable: true, writable: true };
  if (h === true) {      d.enumerable = false;
    if (r === true)      d.readonly = false;
  } else if (r === true) d.readonly = false;
  d.value = val;
  return d;
}