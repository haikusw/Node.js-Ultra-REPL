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
	constructor: __(UltraRLI)
});


UltraRLI.prototype._line = function() {
  var line = this._addHistory();
  this.emit('line', line);
};


UltraRLI.prototype._ttyWrite = function(s, key) {
  var next_word, next_non_word, previous_word, previous_non_word;
  key = key || {};

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
};