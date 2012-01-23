var RLI = require('readline').Interface;
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var tty = require('tty');


require('../lib/string-utils').attachTo(String.prototype);



module.exports = UltraRLI;

function UltraRLI(stream, completer){
  var self = this;
  EventEmitter.call(this);

  var output = this.output = stream.output;
  var input = this.input = stream.input;
  input.resume();

  completer = completer || function(){ return [] };
  this.completer = completer.length === 2 ? completer : function(v, callback){
    callback(null, completer(v));
  };

  this.line = '';
  this.enabled = output.isTTY && !parseInt(process.env['NODE_NO_READLINE'], 10);

  if (!this.enabled) {
    input.on('data', function(){ self._normalWrite.apply(self, arguments) });
  } else {
    tty.setRawMode(true);
    input.on('keypress', function(){ self._ttyWrite.apply(self, arguments) });
    this.cursor = 0;
    this.history = [];
    this.historyIndex = -1;
    this.resize.last = [];
    this.resize();

    if (process.listeners('SIGWINCH').length === 0) {
      process.on('SIGWINCH', this.resize.bind(this));
    }
  }
}

UltraRLI.prototype = {
  __proto__: Object.create(RLI.prototype),
  constructor: UltraRLI,

  resize: function resize(size){
    size = size || this.output.getWindowSize();
    if (size[0] === resize.last[0] && size[1] === resize.last[1]) return;
    resize.last = size;
    this.width = size[0];
    this.height = size[1];
    if (this.height > resize.maxseen) {
      this.fill();
      resize.maxseen = this.height;
    }
    this.emit('resize');
  },

  loadCursor: function loadCursor(){ this._ttyWrite('\x1b[1u') },
  saveCursor: function saveCursor(){ this._ttyWrite('\x1b[1s') },
  clearScreen: function clearScreen(){ this._ttyWrite('\x1b[1J') },

  _line: function _line(){
    var line = this._addHistory();
    if (process.platform === 'win32') this.resize();
    this.emit('line', line);
  },

  fill: function fill(minus){
    var cursor = this.cursor;
    this.output.cursorTo(0, 0);
    this.output.write('\n'.repeat(this.height - minus));
    this.cursor = cursor;
    this.toCursor();
  },

  clearLine: function clearLine(){
    if (this._closed) return;
    this.cursor = 0;
    this.line = '';
    this.output.clearLine();
    this.output.cursorTo(0);
  },

  clearInput: function clearInput(){
    if (this._closed) return;
    this.line = '';
    this.output.cursorTo(0, this.height);
    this.output.clearLine();
    this.output.write(this._prompt);
    this.home();
  },

  refreshLine: function refreshLine(){
    if (this._closed) return;
    this.output.cursorTo(0, this.height);
    this.output.write(this._prompt + this.line);
    this.output.clearLine(1);
    this.output.cursorTo(this._promptLength + this.cursor);
  },

  toCursor: function toCursor(){
    this.output.cursorTo(this._promptLength + this.cursor, this.height);
  },

  home: function home(){
    this.cursor = 0;
    this.output.cursorTo(this._promptLength, this.height);
  },

  setPrompt: function setPrompt(prompt){
    this._prompt = prompt;
    this._promptLength = prompt.alength;
    this.cursor = this.line.alength;
    this.refreshLine();
  },

  clearLines: function clearLines(from, to){
    from = from > to ? [to, to = from][0] : from;
    from = from > 1 ? from : 1;
    to = to < this.height ? to : this.height;
    for (; from < to; from++) {
      this.output.cursorTo(0, from);
      this.output.clearLine();
    }
    this.home();
  },

  writeFrom: function writeFrom(output, left, top){
    output = typeof output === 'string' ? output.split(/\r\n|\n|\r/) : output;
    top = top > 0 ? top : 0;
    left = left || 0;
    this.output.cursorTo(left, top + 1);
    for (var i = 0, len = output.length; i + top < this.height - 1 && i < output.length; i++) {
      this.output.moveCursor(0, 1);
      this.output.write(output[i] );
      this.output.cursorTo(left);
    }
    this.home();
  },

  writePage: function writePage(lines){
    for (var i = 0; i < this.height - 2 && i < lines.length; i++) {
      this.output.cursorTo(0, i + 1);
      this.output.write(lines[i]);
      this.output.clearLine(1);
    };
  },

  scaleX: function scaleX(x){
    if (x === 'center')  return this.width / 2 | 0;
    if (x === 'right')   return this.width;
    if (x === 'left')    return 0;

    if (x > 0 && x < 1)  return x * this.width | 0;
    if (x <= 0)          return 0;
    if (x >= this.width) return this.width;
  },

  scaleY: function scaleY(y){
    if (y === 'center')   return this.height / 2 | 0;
    if (y === 'bottom')   return this.height - 1;
    if (y === 'top')      return 0;

    if (y > 0 && y < 1)   return y * this.height | 0;
    if (y <= 0)           return 0;
    if (y >= this.height) return this.height;
  },

  eraseMount: function eraseMount(mount){
    if (typeof mount === 'string') mount = mounts[mount];
    if (!mount.contents) return;
    this.cursor = this.line.alength;
    this.output.cursorTo(mount.left, mount.top);
    this.output.write(' '.repeat(mount.width).color(mount.bg));
    mount.width = 0;
    mount.contents = '';
    mount.left = null;
    mount.top = null;
  },

  writeMount: function writeMount(mount, message, bg){
    if (typeof mount === 'string') mount = mounts[mount];
    mount.width = message.alength;
    mount.contents = message;
    mount.left = this.scaleX(mount.x);
    mount.top = this.scaleY(mount.y);
    if (mount.align === 'right') {
      mount.left -= mount.width;
    } else if (mount.align === 'center') {
      mount.left -= mount.width / 2 | 0;
    }
    this.cursor = this.line.alength;
    this.output.cursorTo(mount.left, mount.top);
    this.output.write(message.color(bg || mount.bg));
    this.toCursor();
  },

  timedWrite: function timedWrite(mount, message, bg, time){
    if (typeof mount === 'string') mount = mounts[mount];
    if (mount.timer) {
      var expires = mount.timer.expires;
      var contents = mount.contents;
      clearTimeout(mount.timer);
    }
    this.eraseMount(mount);
    this.writeMount(mount, message, bg);

    mount.timer = setTimeout(function remove(){
      this.eraseMount(mount);
      if (expires && expires > Date.now()) {
        this.writeMount(mount, contents, bg);
        mount.timer = setTimeout(remove.bind(this), expires - Date.now());
        mount.timer.expires = expires;
      } else {
        delete mount.timer;
        this.toCursor();
      }
    }.bind(this), time || 5000);

    mount.timer.expires = Date.now() + (time || 5000);
  },

  _insertString: function _insertString(c){
    if (this.cursor < this.line.alength) {
      this.line = this.line.slice(0, this.cursor) + c + this.line.slice(this.cursor, this.line.length);
      this.cursor += c.length;
      this.refreshLine();
    } else {
      this.line += c;
      this.cursor += c.length;
      this.output.write(c);
    }
  },

  _moveLeft: function _moveLeft(count){
    if (this.cursor) {
      this.cursor--;
    }
    this.refreshLine();
  },

  _moveRight: function _moveRight(){
    if (this.cursor !== this.line.alength) {
      this.cursor++;
    }
    this.refreshLine();
  },

  _lineLeft: function _lineLeft(){
    this.cursor = 0;
    this.output.moveCursor(0);
    this.refreshLine();
  },

  _lineRight: function _lineRight(){
    this.cursor = this.line.alength;
    this.output.moveCursor(this.line.alength);
    this.refreshLine();
  },

  _deleteLeft: function _deleteLeft() {
    if (this.cursor && this.line.length) {
      this.line = this.line.slice(0, this.cursor - 1) + this.line.slice(this.cursor);
      this.cursor--;
      this.refreshLine();
    }
  },

  _deleteRight: function _deleteRight() {
    if (this.cursor < this.line.length) {
      this.line = this.line.slice(0, this.cursor) + this.line.slice(this.cursor + 1);
      this.refreshLine();
    }
  },

  translate: function translate(val, key){
    key = key || {};
    key.shift = !!key.shift;
    key.ctrl = !!key.ctrl;
    key.meta = !!key.meta;
    key.name = namemap[key.name] || key.name || '';
    key.bind = key.bind || mods[key.ctrl | key.meta << 1 | key.shift << 2] + key.name;
    return key;
  },

  _ttyWrite: function _ttyWrite(s, key){
    key = this.translate(s, key);
    this.emit('keybind', key);
    if (key.used) return;

    if (Buffer.isBuffer(s)) {
      s = s.toString('utf-8');
    }
    if (s) {
      var lines = s.split(/\r\n|\n|\r/);
      for (var i = 0, len = lines.length; i < len; i++) {
        i && this._line();
        this._insertString(lines[i]);
      }
    }
  }
};

UltraRLI.prototype._refreshLine = UltraRLI.prototype.refreshLine;

var namemap = { backspace: 'bksp',
                escape:    'esc',
                delete:    'del',
                pagedown:  'pgdn',
                pageup:    'pgup',
                insert:    'ins' };

var mods = [ '',
             'ctrl+',
             'alt+',
             'ctrl+alt+',
             'shift+',
             'ctrl+shift+',
             'alt+shift+',
             'ctrl+alt+shift+' ];

var mounts = {
  topright: {
    x: 'right',
    y: 'top',
    align: 'right',
    bg: 'bgcyan'
  },
  topcenter: {
    x: 'center',
    y: 'top',
    align: 'center',
    bg: 'bgcyan'
  }
};
