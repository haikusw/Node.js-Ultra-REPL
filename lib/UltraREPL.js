require('harmony-collections').attachIfMissing(global);

var util = require('util');
var vm = require('vm');
var path = require('path');
var repl = require('repl');
var REPLServer = repl.REPLServer;

var commands = require('./commands');
var Iterable = require('./Iterable');
var IsolatedContext = require('./IsolatedContext');

var style = require('../settings/styling');
var builtins = require('../settings/builtins');

require('./string-utils').attachTo(String.prototype);

var __ = require('./object-utils').descriptor;
var maxLength = require('./string-utils').maxLength;
var chunk = require('./string-utils').chunk;


//var ui = require('./ui');

module.exports.UltraREPL = UltraREPL;


function UltraREPL(prompt){
  String.prototype.color.context = this;
  this.contexts = new Iterable;
  this.settings = new IsolatedContext(null, true);
  this.iterator =  this.contexts.__iterator__();
  Object.defineProperty(this, 'context', function(repl){
    return { get: function(){ return repl.settings.ctx },
             set: function(v){ throw new Error('Something tried to set context') } };
  }(this));
  this.contexts.add('global', this.settings);

  this.appPrompt = prompt || 'js';
  REPLServer.call(this, '', null, this.evaler, true);
  this.settings.columns = this.rli.output.getWindowSize()[0];
  this.useGlobal = false;
  repl.writer = this.writer.bind(this);
  fixEmitKey(this.inputStream);

  var mods = [ '', 'ctrl+', 'alt+', 'ctrl+alt+', 'shift+',
               'ctrl+shift+', 'alt+shift+', 'ctrl+alt+shift+' ];

  this.rli.input.on('keypress', function(line, key){
    if (!key) return;
    var keybind = mods[key.ctrl | key.meta << 1 | key.shift << 2] + key.name;
    if (this.keybinds.has(keybind)) {
      this.keybinds.get(keybind).call(this, line);
    }
  }.bind(this));

  this.keywords = new Map;
  this.keybinds = new Map;
  this.commands = {};
  this.help = [];

  commands(this);
  //ui(this);

  // TODO get this out of here
  this.clearLine();
  this.print(' ' + this.help[0].activation.color(style.help[this.help[0].type]) +
              ' to see command list'.color(style.help.intro));
  this.clearWindow();
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
      this.clearLine();
      return [].slice.call(arguments).forEach(function(s){
        if (s && s.length) {
          this.rli.output.write(s[0].color(s[1]) + ' ');
        }
      }, this);
    }
    this.rli.output.write(text.color(color));
  }),

  clearInput: __(function clearInput(){
    this.rli.output.cursorTo(this.rli._promptLength);
    this.rli.output.clearLine(1);
  }),

  clearLine: __(function clearLine(){
    this.rli.output.clearLine();
    this.rli.output.cursorTo(0);
  }),

  clearWindow: __(function clearWindow(minus){
    var lines = this.rli.output.getWindowSize()[1];
    if (minus > 0) lines -= minus;
    if (minus < 0) lines += minus;
    this.print('\n'.repeat(lines - 1));
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
      var result = this.keywords.get(cmd).call(this, cmd);
      this.context._ = result;
      return result;
    }
  }),

  showHelp: __(function showHelp(){
    var nMax = maxLength(this.help, 'name') + 2;
    var aMax = maxLength(this.help, 'activation') + 2;
    var dMin = nMax + aMax + 2;
    var dMax = this.rli.output.getWindowSize()[0] - nMax - aMax - 5;

    var output = this.help.map(function(cmd){

      if (cmd.type === 'keywords' && cmd.activation !== '') {
        cmd.help += '\n' + chunk(', ', dMax, dMin, cmd.activation).color(style.help.keywords);
        cmd.activation = '';
      }

      return cmd.name.margin(nMax).color(style.help.names) +
             cmd.activation.margin(aMax).color(style.help[cmd.type]) +
             cmd.help;

    }, this);
    output.unshift('');
    this.print(output.join('\n'));
    this.clearWindow(-output.length);
    this.displayPrompt();
  }),

  updatePrompt: __(function updatePrompt(){
    var prompt = [this.appPrompt];
    if (this.contexts.count() > 1) {
      prompt.push(((this.iterator.current + 1) + '/' + this.contexts.count()).color(style.contexts.number));
      prompt.push(this.settings.name.color(this.settings.color));
    }
    if (this.messages) {
      prompt.push(this.messages);
      this.messages = null;
    }
    prompt = prompt.join(style.prompt.separator[0].color(style.prompt.separator[1]));
    prompt += style.prompt.end[0].color(style.prompt.end[1]);
    this.rli.setPrompt(prompt, prompt.alength);
    this.rli._refreshLine();
  }),

  writer: __(function writer(obj){
    return this.context._;
  }),

  timedMessage: __(function timedMessage(message, color, time){
    message = message.color(color);

    this.messages = message;
    this.updatePrompt();

    clearTimeout(this.timer);
    this.timer = setTimeout(this.updatePrompt.bind(this), time || 5000);
   }),

  createContext: __(function createContext(){
    var context = new IsolatedContext(this.rli.output.getWindowSize()[0] - 10);
    this.contexts.add(context.name, context);
    this.changeContext(this.contexts.count() - 1);
    this.timedMessage('++created', style.contexts.created);
  }),

  changeContext: __(function changeContext(to, silent){
    this.lines = [];
    this.lines.level = [];

    var info = this.iterator.advance(to);

    if (info && this.context === info.ctx) {
      return this.timedMessage('no contexts', style.error);
    }

    this.settings = info;

    if (!silent) {
      this.updatePrompt();
    }
  }),

  deleteContext: __(function deleteContext(){
    if (this.iterator.current === 0) {
      return this.timedMessage('not deletable', style.error);
    }

    var info = this.settings;
    this.contexts.remove(this.iterator.current);
    this.changeContext(this.iterator.current, true);

    this.timedMessage('--deleted '.color(style.contexts.deleted) + info.name.color(info.color));
  }),

  resetContext: __(function resetContext(force) {
    if (this.context === global) return;
    for (var i in require.cache) {
      delete require.cache[i];
    }
    this.timedMessage('reset', style.contexts.reset);
  })
});



/* fix some missing keys in Node's tty until it's fixed upstream
   https://github.com/Benvie/node/commit/95a7681a4f16609291b26de073e5343f9a3f4287 */
function fixEmitKey(ttyStream){
  var ttyStreamProto = Object.getPrototypeOf(ttyStream);
  var sourcecode = ttyStreamProto._emitKey + '';

  if (~sourcecode.indexOf('[[A')) return;

  var re1 = /^(?:\x1b)([a-zA-Z0-9])$/;
  var re2 = /^(?:\x1b+)(O|N|\[|\[\[)(?:(\d+)(?:;(\d+))?([~^$])|(?:1;)?(\d+)?([a-zA-Z]))/;

  sourcecode = sourcecode.split('\n').slice(1);
  sourcecode.unshift(
    '(function(){',
    'var metaKeyCodeRe = ' + re1,
    'var functionKeyCodeRe = ' + re2,
    'return function(s){'
  );
  sourcecode.push('})()');

  for (var spliceAt = sourcecode.length; --spliceAt >= 0;) {
    if (sourcecode[spliceAt].trim() === 'switch (code) {') {
      spliceAt++;
      break;
    }
  }
  if (!~spliceAt) return;

  sourcecode.splice(spliceAt, 0, [
    ['[[A', 'f1'],
    ['[[B', 'f2'],
    ['[[C', 'f3'],
    ['[[D', 'f4'],
    ['[[E', 'f5']
  ].map(function(map){
    return "case '"+map[0]+"': key.name = '"+map[1]+"'; break;";
  }).join('\n'));

  ttyStreamProto._emitKey = vm.runInThisContext(sourcecode.join('\n'));
}