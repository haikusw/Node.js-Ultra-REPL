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
    input.on('data', function(data){ self._normalWrite(data) });
  } else {
    input.on('keypress', function(s, key){ self._ttyWrite(s, key) });
    tty.setRawMode(true);
    this.cursor = 0;
    this.history = [];
    this.historyIndex = -1;
    this._promptLength = 0;
    this._prompt = '';
    this.resize.last = [];
    this.resize();

    if (process.listeners('SIGWINCH').length === 0) {
      process.on('SIGWINCH', this.resize.bind(this));
    }
  }
}

UltraRLI.prototype = {
  __proto__: EventEmitter.prototype,
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

  close: function close(d) {
    if (this._closing) return;
    this._closing = true;
    if (this.enabled) {
      tty.setRawMode(false);
    }
    this.emit('close');
    this._closed = true;
  },

  pause: function pause() {
    if (this.enabled) {
      tty.setRawMode(false);
    }
  },

  resume: function resume() {
    if (this.enabled) {
      tty.setRawMode(true);
    }
  },

  loadCursor: function loadCursor(){ this.output.write('\x1b[1u') },
  saveCursor: function saveCursor(){ this.output.write('\x1b[1s') },
  clearScreen: function clearScreen(){ this.output.write('\x1b[1J') },

  _addHistory: function _addHistory() {
    if (this.line.length === 0) return '';

    this.history.unshift(this.line);
    this.historyIndex = -1;
    if (this.history.length > 100) this.history.pop();

    this.clearLine();
    return this.history[0];
  },

  _historyNext: function _historyNext() {
    if (this.historyIndex > 0) {
      this.line = this.history[--this.historyIndex];
      this.cursor = this.line.length;
      this.refreshLine();

    } else if (this.historyIndex === 0) {
      this.historyIndex = -1;
      this.clearInput();
    }
  },

  _historyPrev: function _historyPrev() {
    if (this.historyIndex + 1 < this.history.length) {
      this.historyIndex++;
      this.line = this.history[this.historyIndex];
      this.cursor = this.line.length;
      this.refreshLine();
    }
  },

  _line: function _line(){
    var line = this._addHistory();
    //if (process.platform === 'win32') this.resize();
    this.emit('line', line);
  },

  fill: function fill(minus){
    this.output.cursorTo(0, 0);
    this.output.write('\n'.repeat(this.height - minus));
    this.toCursor();
  },

  eraseInput: function eraseInput(){
    this.output.cursorTo(0, this.height);
    this.output.clearLine();
    this.output.moveCursor(-this.width);
  },

  clearLine: function clearLine(){
    this.cursor = 0;
    this.line = '';
    this.eraseInput();
  },

  clearInput: function clearInput(){
    this.cursor = 0;
    this.line = '';
    this.refreshLine();
  },

  refreshLine: function refreshLine(){
    this.eraseInput();
    this.output.write(this._prompt + this.line);
    this.toCursor();
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
    this.toCursor();
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
    this.toCursor();
  },

  writePage: function writePage(lines){
    for (var i = 0; i < this.height - 2 && i < lines.length; i++) {
      this.output.cursorTo(0, i + 1);
      this.output.write(lines[i]);
      this.output.clearLine(1);
    };
    this.toCursor();
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
    if (this.cursor < this.line.length) {
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
    this.toCursor();
  },

  _moveRight: function _moveRight(){
    if (this.cursor !== this.line.length) {
      this.cursor++;
    }
    this.toCursor();
  },

  _lineLeft: function _lineLeft(){
    this.cursor = 0;
    this.toCursor();
  },

  _lineRight: function _lineRight(){
    this.cursor = this.line.length;
    this.toCursor();
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

  _wordLeft: function _wordLeft() {
    if (this.cursor && this.line.length) {
      var leading = this.line.slice(0, this.cursor);
      var match = leading.match(/([^\w\s]+|\w+|)\s*$/);
      if (match) {
        this.cursor -= match[0].length;
        this.toCursor();
      }
    }
  },

  _wordRight: function _wordRight() {
    if (this.cursor < this.line.length) {
      var trailing = this.line.slice(this.cursor);
      var match = trailing.match(/^(\s+|\W+|\w+)\s*/);
      if (match) {
        this.cursor += match[0].length;
        this.toCursor();
      }
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

  write: function write(d, key) {
    if (this._closed) return;
    this.enabled ? this._ttyWrite(d, key) : this._normalWrite(d, key);
  },

  _normalWrite: function _normalWrite(b) {
    if (b !== undefined)
      this._onLine(b.toString());
  },

  _ttyWrite: function _ttyWrite(s, key){
    key = this.translate(s, key);
    this.emit('keybind', key);
    if (key.used || key.ctrl || key.meta) return;

    if (Buffer.isBuffer(s)) {
      s = s.toString('utf8');
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