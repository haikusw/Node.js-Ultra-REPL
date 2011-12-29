require('harmony-collections').attachIfMissing(global);

var util = require('util');
var vm = require('vm');
var path = require('path');
var repl = require('repl');
var REPLServer = repl.REPLServer;

var commands = require('./commands');
var Iterable = require('./Iterable');
var REPLContext = require('./REPLContext');

var style = require('../settings/styling');
var builtins = require('../settings/builtins');

var utilities = require('./utilities');
var colors = utilities.color;
var __ = utilities.descriptor;
var ansilength = utilities.ansilength;
var margins = utilities.margins;
var indent = utilities.indent;
var chunk = utilities.chunk;
var maxLength = utilities.maxLength;


//Object.defineProperties(Object.prototype, {
//  alength: __(utilities.ansilength, true)
//});

//var ui = require('./ui');

module.exports.UltraREPL = UltraREPL;


function UltraREPL(prompt){
  colors = colors.bind(this);
  this.contexts = new Iterable;
  this.settings = new REPLContext(null, true);
  this.iterator =  this.contexts.__iterator__();
  this.contexts.add('global', this.settings);
  this.context = global;

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

  this.print(['"' + this.help[0].activation + '" to see command list', style.help.intro])
  this.clearWindow(-1);
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
          this.rli.output.write(colors(s[0] + ' ', s[1]));
        }
      }, this);
    }
    this.rli.output.write(colors(text, color));
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
    var lines = this.rli.output.getWindowSize()[1] + 1;
    if (minus > 0) lines -= minus;
    if (minus < 0) lines += minus;
    this.print(Array(lines).join('\n'));
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
    var nameMax = maxLength(this.help, 'name') + 4;
    var actMax = maxLength(this.help, 'activation') + 2;
    var descWidth = this.rli.output.getWindowSize()[0] - nameMax - actMax - 4;

    var output = this.help.map(function(command){

      if (command.type === 'keywords' && command.activation !== '') {
        command.activation = chunk(', ', [descWidth - 10, descWidth], command.activation);
        command.activation = indent(nameMax + actMax + 4, command.activation);
        command.help += '\n' + colors(command.activation, style.help.keywords);
        command.activation = '';
      }

      return margins(nameMax, '  ' + colors(command.name, style.help.names)) +
             margins(actMax, colors(command.activation, style.help[command.type])) +
             command.help;

    }, this);
    output.unshift('');
    this.print(output.join('\n'));
    this.clearWindow(-output.length - 1);
    this.displayPrompt();
  }),

  updatePrompt: __(function updatePrompt(){
    var prompt = [this.appPrompt];
    if (this.contexts.count() > 1) {
      prompt.push(colors((this.iterator.current + 1) + '/' + this.contexts.count(), style.contexts.number));
      prompt.push(colors(this.settings.name, this.settings.color));
    }
    if (this.messages) {
      prompt.push(this.messages);
      this.messages = null;
    }
    prompt = prompt.join(colors(style.prompt.separator)) + colors(style.prompt.end);
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
    var context = new REPLContext(this.rli.output.getWindowSize()[0] - 10);
    this.contexts.add(context.name, context);
    this.changeContext(this.contexts.count() - 1);
    this.context = context.ctx;
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
    this.context = info.ctx;

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

    this.timedMessage('--deleted ' + colors(info.name, info.color), style.contexts.deleted);
  }),

  resetContext: __(function resetContext(force) {
    if (this.context === global) return;
    for (var i in require.cache) {
      delete require.cache[i];
    }
    this.context = this.settings.initialize();
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