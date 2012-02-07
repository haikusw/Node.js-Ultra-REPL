//doesn't quite work yet, getting there


var TTY = process.binding('tty_wrap').TTY;
var tty = require('tty');
var net = require('net');
var util = require('util');
var repl = require('repl');
var EventEmitter = require('events').EventEmitter;

var sockets = {};


(function(start){

// backasswards startup to keep this in one file and have initialization
// visually at the top. It's not important.
  var REPL = start();
  inspect(REPL);
  REPL.rli.prompt();




}).call(null, function(){

  tty.isatty = function isatty(fd){ return true }
  tty.setRawMode = function setRawMode(flag){}

  function start(){
    monkeypatch();
    //makenew();

    repl.disableColors = false;
    return repl.start(null, sockets, null, true);
    //return repl.start(null, null, null, true);
  }

  sockets = { stdin: OverrideReadStream,
              stdout: OverrideWriteStream,
              stderr: OverrideWriteStream };


  // method 1: create new js interfaces to the existing fds
  function makenew(){
    Object.keys(sockets).forEach(function(name, i){
      sockets[name] = new sockets[name](i);
      EventEmitter.call(sockets[name]);
    });
  }

  // // method 2: monkeypatch existing ones
  function monkeypatch(){
    Object.keys(sockets).forEach(function(name, i){
      sockets[name].call(process[name], i);
      process[name]._handle.__proto__ = TTY.prototype;
      process[name].__proto__ = sockets[name].prototype;
      sockets[name] = process[name];
    });
  }


  function OverrideReadStream(fd){
    tty.ReadStream.call(this, fd);
  }

  OverrideReadStream.prototype = {
    __proto__: tty.ReadStream.prototype,
    constructor: OverrideReadStream,
    pause: function pause(){
      this._handle.unref();
      return net.Socket.prototype.pause.call(this);
    },
    resume: function resume(){
      this._handle.ref();
      return net.Socket.prototype.resume.call(this);
    }
  };


  function OverrideWriteStream(fd) {
    tty.WriteStream.call(this, fd);
  }

  OverrideWriteStream.prototype = {
    __proto__: tty.WriteStream.prototype,
    constructor: OverrideWriteStream,
    getWindowSize: function getWindowSize() { return [80, 30] }
  }

  return start;
}());

function inspect(){
  console.log.apply(this, [].slice.call(arguments).map(function(o){
    return util.inspect(o, true, 6, true)+'\n';
  }));
}