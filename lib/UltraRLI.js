var RLI = require('readline').Interface;
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var tty = require('tty');

var __ = require('./object-utils').descriptor;


require('./string-utils').attachTo(String.prototype);

var setMounts = require('../settings/mounts');
var mounts;

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

  this.line = '';
  this.enabled = output.isTTY && !parseInt(process.env['NODE_NO_READLINE'], 10);

  if (!this.enabled) {
    input.on('data', this._normalWrite.bind(this));
  } else {
    tty.setRawMode(true);
    input.on('keypress', this._ttyWrite.bind(this));
    this.enabled = true;
    this.cursor = 0;
    this.history = [];
    this.historyIndex = -1;
    this.resize();

    if (process.listeners('SIGWINCH').length === 0) {
      process.on('SIGWINCH', this.resize.bind(this));
    }
  }
}

util.inherits(UltraRLI, RLI);


UltraRLI.prototype = Object.create(RLI.prototype, {

  constructor: __(UltraRLI),

  resize: __(function resize(size){
    size || (size = this.output.getWindowSize());
    this.width = size[0];
    this.height = size[1];
    mounts = setMounts(size);
  }),

  loadCursor: __(function loadCursor(){ this._ttyWrite('\x1b[1u') }),
  saveCursor: __(function saveCursor(){ this._ttyWrite('\x1b[1s') }),
  clearScreen: __(function clearScreen(){ this._ttyWrite('\x1b[1J') }),

  _line: __(function _line(){
    var line = this._addHistory();
    this.emit('line', line);
  }),

  fill: __(function fill(minus){
    this.output.write('\n'.repeat(this.height - minus));
  }),

  clearLine: __(function clearLine(){
    if (this._closed) return;
    this.cursor = 0;
    this.line = '';
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

  toCursor: __(function toCursor(){
    this.output.cursorTo(this._promptLength + this.cursor, this.height);
  }),

  home: __(function home(){
    this.cursor = 0;
    this.output.cursorTo(this._promptLength, this.height);
  }),

  setPrompt: __(function setPrompt(prompt){
    this._prompt = prompt;
    this._promptLength = prompt.alength;
    this.cursor = this.line.alength;
    this.refreshLine();
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
    output = typeof output === 'string' ? output.split(/\r\n|\n|\r/) : output;
    top = top || 0;
    left = left || 0;
    var i = 0;
    this.output.cursorTo(left, top);
    for (var i = top, len = output.length; i < this.height - 1 && i < len; i++) {
      this.output.write(output[i]);

      this.output.clearLine(1);
      this.output.cursorTo(0);
      this.output.moveCursor(0, 1);
    }
    this.home();
  }),

  writePage: __(function writePage(lines){
    for (var i = 0; i < this.height - 1; i++) {
      this.output.cursorTo(0, i);
      if (i < lines.length) {
        this.output.write(lines[i] + ' '.repeat(this.width - lines[i].width - 1));
      }
      this.output.clearLine(1);
    };
  }),

  eraseMount: __(function eraseMount(mount){
    if (typeof mount === 'string') mount = mounts[mount];
    if (!mount.contents) return;
    this.cursor = this.line.alength;
    this.output.cursorTo(mount.left | 0, mount.y);
    this.output.write(' '.repeat(mount.width));
    mount.width = 0;
    mount.contents = '';
    mount.left = mount.x
  }),

  writeMount: __(function writeMount(mount, message){
    if (typeof mount === 'string') mount = mounts[mount];
    mount.width = message.alength;
    mount.contents = message;
    mount.left = mount.x;
    if (mount.align === 'right') {
      mount.left -= mount.width;
    } else if (mount.align === 'center') {
      mount.left -= mount.width / 2;
    }
    this.cursor = this.line.alength;
    this.output.cursorTo(mount.left | 0, mount.y);
    this.output.write(message);
    this.toCursor();
  }),

  timedWrite: __(function timedWrite(mount, message, time){
    if (typeof mount === 'string') mount = mounts[mount];
    if (mount.timer) {
      var expires = mount.timer.expires;
      var contents = mount.contents;
      clearTimeout(mount.timer);
    }
    this.eraseMount(mount);
    this.writeMount(mount, message);

    mount.timer = setTimeout(function remove(){
      this.eraseMount(mount);
      if (expires && expires > Date.now()) {
        this.writeMount(mount, contents);
        mount.timer = setTimeout(remove.bind(this), expires - Date.now());
        mount.timer.expires = expires;
      } else {
        delete mount.timer;
        this.toCursor();
      }
    }.bind(this), time || 5000);

    mount.timer.expires = Date.now() + (time || 5000);
  }),


  translate: (function(namemap, mods){
    return __(function translateKey(val, key){
      if (!key) key = {};
      'ctrl' in key || (key.ctrl = false);
      'meta' in key || (key.meta = false);
      'shift' in key || (key.shift = false);
      'name' in key || (key.name = val || '');
      key.name in namemap && (key.name = namemap[key.name]);
      'bind' in key || (key.bind = mods[key.ctrl | key.meta << 1 | key.shift << 2] + key.name);
      return key;
    });
  })({ backspace: 'bksp',
       escape:    'esc',
       delete:    'del',
       pagedown:  'pgdn',
       pageup:    'pgup',
       insert:     'ins' },
     [ '', 'ctrl+', 'alt+', 'ctrl+alt+', 'shift+',
        'ctrl+shift+', 'alt+shift+', 'ctrl+alt+shift+' ]),

  _ttyWrite: __(function _ttyWrite(s, key){
    var next_word, next_non_word, previous_word, previous_non_word;

    key = this.translate(s, key);

    if (key.ctrl && key.shift) switch (key.name) {

      case 'bksp':      this._deleteLineLeft(); break;
      case 'del':       this._deleteLineRight(); break;

    } else if (key.ctrl)       switch (key.name) {

      case 'del':       this._deleteWordRight(); break;
      case 'bksp':      this._deleteWordLeft(); break;
      case 'left':      this._wordLeft(); break;
      case 'right':     this._wordRight();

    } else                     switch (key.name) {

      case 'enter':     this._line(); break;
      case 'bksp':      this._deleteLeft(); break;
      case 'del':       this._deleteRight(); break;
      case 'tab':       this._tabComplete(); break;
      case 'left':      this.cursor > 0 && this.cursor-- && this.output.moveCursor(-1, 0); break;
      case 'right':     this.cursor != this.line.alength &&  this.cursor++ &&  this.output.moveCursor(1, 0); break;
      case 'home':      this.cursor = 0; this.refreshLine(); break;
      case 'end':       this.cursor = this.line.alength; this.refreshLine(); break;
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
    return key;
  })
});
