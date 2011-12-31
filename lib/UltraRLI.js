var RLI = require('readline').Interface;
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var tty = require('tty');

var __ = require('./object-utils').descriptor;

module.exports = UltraRLI;

function UltraRLI(stream, completer){
  EventEmitter.call(this);

  completer = completer || function() { return []; };

  var output = this.output = stream.output;
  var input = this.input = stream.input;

  input.resume();

  this.completer = completer.length === 2 ? completer : function(v, callback){
    callback(null, completer(v));
  };

  //this.setPrompt('> ');

  this.enabled = output.isTTY && !parseInt(process.env['NODE_NO_READLINE'], 10);

  if (!this.enabled) {
    input.on('data', this._normalWrite.bind(this));
  } else {
    tty.setRawMode(true);
    input.on('keypress', this._ttyWrite.bind(this));
    this.line = '';
    this.enabled = true;
    this.cursor = 0;
    this.history = [];
    this.historyIndex = -1;
    this.columns = output.getWindowSize()[0];
    if (process.listeners('SIGWINCH').length === 0) {
      process.on('SIGWINCH', function(){
        this.columns = output.getWindowSize()[0];
      }.bind(this));
    }
  }
}

util.inherits(UltraRLI, RLI);

UltraRLI.prototype = Object.create(RLI.prototype, {
	constructor: __(UltraRLI),

  _line: __(function _line(){
    var line = this._addHistory();
    this.emit('line', line);
  }),

  loadCursor: __(function loadCursor(){
    this._ttyWrite('\x1b[1u');
  }),
  saveCursor: __(function saveCursor(){
    this._ttyWrite('\x1b[1s');
  }),

  clearScreen: __(function clearScreen(){
    this._ttyWrite('\x1b[1J');
  }),

  fill: __(function fill(minus){
    this.output.write('\n'.repeat(this.height - minus));
  }),

  clearLine: __(function clearLine(){
    this.cursor = 0;
    this.output.clearLine();
    this.output.cursorTo(0);
  }),

  clearInput: __(function clearInput(){
    if (this._closed) return;
    this.line = '';
    this.output.cursorTo(0, this.height);
    this.output.clearLine();
    this.output.write(this._prompt);
    this.home();
  }),

  refreshLine: __(function refreshLine(){
    if (this._closed) return;
    this.output.cursorTo(0, this.height);
    this.output.clearLine();
    this.output.write(this._prompt + this.line);
    this.output.cursorTo(this._promptLength + this.cursor);
  }),

  home: __(function home(){
    this.cursor = this._promptLength;
    this.output.cursorTo(this._promptLength, this.height);
  }),

  setPrompt: __(function setPrompt(prompt){
    this._prompt = prompt;
    this._promptLength = prompt.alength;
  }),

  clearLines: __(function clearLines(from, to){
    from = from > to ? [to, to = from][0] : from;
    from = from > 0 ? from : 0;
    to = to < this.height ? to : this.height;
    for (; from < to; from++) {
      this.output.cursorTo(0, from);
      this.output.clearLine();
    }
    this.home();
  }),

  writeFrom: __(function writeFrom(output, top, left){
    output = Array.isArray(output) ? output : output.split(/\r\n|\n|\r/);
    top = top || 0;
    left = left || 0;
    var i = 0;
    this.output.cursorTo(left, top);
    for (var i = 0, len = output.length; i < this.height - 1 && i < len; i++) {
      this.output.write(output[i]);
      this.output.clearLine(1);
      this.output.cursorTo(0);
      this.output.moveCursor(0, 1);
    }
    this.home();
  }),


  height: __(function getter(){
    var val = this.output.getWindowSize()[1];
    Object.defineProperty(this, 'height', { value: val, enumerable: true });
    return val;
  }),

  width: __(function getter(){
    var val = this.output.getWindowSize()[0];
    Object.defineProperty(this, 'width', { value: val, enumerable: true });
    return val;
  }),

  _ttyWrite: __(function _ttyWrite(s, key){
    var next_word, next_non_word, previous_word, previous_non_word;
    key = key || {};
    key.bind = translate(key);
    //console.log(s, key)

    if (key.ctrl && key.shift) switch (key.name) {

      case 'backspace':  this._deleteLineLeft(); break;
      case 'delete':     this._deleteLineRight(); break;

    } else if (key.ctrl)       switch (key.name) {

      //case 'c':          this.listeners('SIGINT').length ? this.emit('SIGINT') : this._attemptClose(); break;
      //case 'z': process.kill(process.pid, 'SIGTSTP'); return;
      case 'delete':     this._deleteWordRight(); break;
      case 'backspace':  this._deleteWordLeft(); break;
      case 'left':       this._wordLeft(); break;
      case 'right':      this._wordRight();

    } else switch (key.name) {

      case 'enter':     this._line(); break;
      case 'backspace': this._deleteLeft(); break;
      case 'delete':    this._deleteRight(); break;
      case 'tab':       this._tabComplete(); break;
      case 'left':      this.cursor > 0 && this.cursor-- && this.output.moveCursor(-1, 0); break;
      case 'right':     this.cursor != this.line.length &&  this.cursor++ &&  this.output.moveCursor(1, 0); break;
      case 'home':      this.cursor = 0; this._refreshLine(); break;
      case 'end':       this.cursor = this.line.length; this._refreshLine(); break;
      case 'up':        this._historyPrev(); break;
      case 'down':      this._historyNext(); break;
      default:
        if (Buffer.isBuffer(s)) s = s.toString('utf-8');
        if (s) {
          var lines = s.split(/\r\n|\n|\r/);
          for (var i = 0, len = lines.length; i < len; i++) {
            if (i > 0) this._line();
            this._insertString(lines[i]);
          }
        }
    }
  })
});


var mods = [ '', 'ctrl+', 'alt+', 'ctrl+alt+', 'shift+',
             'ctrl+shift+', 'alt+shift+', 'ctrl+alt+shift+' ];

var namemap = {
  backspace: 'bksp',
  escape: 'esc',
  delete: 'del',
  pagedown: 'pgdn',
  pageup: 'pgup',
  insert: 'ins'
}

function translate(key){
  if (!key || !('ctrl' in  key)) return '';
  return mods[key.ctrl | key.meta << 1 | key.shift << 2] +
         key.name in namemap ? namemap[key.name] : key.name;
}





