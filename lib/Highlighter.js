// Adapted from CodeMirror2
//
// http://codemirror.net/
// Copyright (C) 2011 by Marijn Haverbeke <marijnh@gmail.com>
// license --> ../lib/codemirror/LICENSE

var EventEmitter = require('events').EventEmitter;

var jsparse = require('./utility/jsparse');

var indent = 2;

module.exports = Highlighter;

function Highlighter(code, callback){
  if (Object.getPrototypeOf(this) !== Highlighter.prototype) {
    return new Highlighter(code);
  }
  if (typeof code !== 'string') {
    throw new TypeError('Code must be a string');
  }
  Object.defineProperties(this, {
    callback: { value: callback },
    history:  { value: [] },
    code:     { value: code }
  });
}

Highlighter.highlight = function highlight(code, callback){
  var highlighter = new Highlighter(code, callback);
  if (callback) {
    highlighter.parse();
  } else {
    setTimeout(highlighter.parse.bind(highlighter), 1);
    return highlighter;
  }
}

Highlighter.prototype = {
  __proto__: EventEmitter.prototype,
  constructor: Highlighter,
  parse: function parse(){
    var mode = jsparse(indent);
    var lines = this.code.split(/\r?\n/);
    var state = mode.startState();
    for (var i = 0, e = lines.length; i < e; ++i) {
      i && this.emit('line');
      var stream = new StringStream(lines[i]);
      while (!stream.eol()) {
        var style = mode.token(stream, state);
        var current = stream.current();
        if (current.length === 1 && typeof style === 'undefined'){
          style = punctuation[current];
        }
        this.emit('token', current, style, i, stream.start);
        stream.start = stream.pos;
      }
    }
    this.emit('end');
  },
  emit: function emit(){
    this.history.push(Array.prototype.slice.call(arguments));
    if (this.callback) {
      this.callback.apply(this, arguments);
    }
  }
};

var punctuation = {
  ')': 'round',
  '(': 'round',
  '[': 'square',
  ']': 'square',
  '}': 'curly',
  '{': 'curly',
  ',': 'punctuation',
  ';': 'punctuation',
  '.': 'punctuation'
};