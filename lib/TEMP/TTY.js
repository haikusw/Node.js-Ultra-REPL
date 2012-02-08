var tty = require('tty');
var TTY = process.binding('tty_wrap').TTY;
var net = require('net');


function isatty(fd){ return true }
function setRawMode(flag){}
function getWindowSize() { return [80, 30] }
function setWindowSize(){}


module.exports = {
  ReadStream: ReadStream,
  WriteStream: WriteStream,
  isatty: isatty,
  setRawMode: setRawMode,
  getWindowSize: getWindowSize,
  setWindowSize: setWindowSize
}

tty.isatty = isatty;
tty.setRawMode = setRawMode;





function ReadStream(fd){
  tty.ReadStream.apply(this, arguments);
}

ReadStream.prototype = {
  constructor: ReadStream,
  __proto__: tty.ReadStream.prototype,

  isTTY: true,

  pause: function pause(){
    //this._handle.unref();
    //return net.Socket.prototype.pause.call(this);
  },
  resume: function resume(){
    //this._handle.ref();
    //return net.Socket.prototype.resume.call(this);
  }
};



function WriteStream(fd) {
  tty.WriteStream.apply(this, arguments);
}

WriteStream.prototype = {
  constructor: WriteStream,
  __proto__: tty.WriteStream.prototype,

  isTTY: true,

  getWindowSize: getWindowSize,
  setWindowSize: setWindowSize,

  cursorTo: function cursorTo(x, y) {
    if (typeof x !== 'number' && typeof y !== 'number')
      return;

    if (typeof x !== 'number')
      throw new Error("Can't set cursor row without also setting it's column");

    if (typeof y !== 'number') {
      this.write('\x1b[' + (x + 1) + 'G');
    } else {
      this.write('\x1b[' + (y + 1) + ';' + (x + 1) + 'H');
    }
  },


  moveCursor: function moveCursor(dx, dy){
    if (dx < 0) {
      this.write('\x1b[' + (-dx) + 'D');
    } else if (dx > 0) {
      this.write('\x1b[' + dx + 'C');
    }

    if (dy < 0) {
      this.write('\x1b[' + (-dy) + 'A');
    } else if (dy > 0) {
      this.write('\x1b[' + dy + 'B');
    }
  },

  clearLine: function clearLine(dir){
    if (dir < 0) {
      // to the beginning
      this.write('\x1b[1K');
    } else if (dir > 0) {
      // to the end
      this.write('\x1b[0K');
    } else {
      // entire line
      this.write('\x1b[2K');
    }
  }
}



/*
libuv Windows ansi mappings

var map = ['', 'shift+', 'ctrl+', 'ctrl+shift+'];

var keybinds = [
  ['insert',  '[2~',  '[2;2~', '[2;5~', '[2;6~'],
  ['end',     '[4~',  '[4;2~', '[4;5~', '[4;6~'],
  ['down',    '[B',   '[1;2B', '[1;5B', '[1;6B'],
  ['next',    '[6~',  '[6;2~', '[6;5~', '[6;6~'],
  ['left',    '[D',   '[1;2D', '[1;5D', '[1;6D'],
  ['clear',   '[G',   '[1;2G', '[1;5G', '[1;6G'],
  ['right',   '[C',   '[1;2C', '[1;5C', '[1;6C'],
  ['up',      '[A',   '[1;2A', '[1;5A', '[1;6A'],
  ['home',    '[1~',  '[1;2~', '[1;5~', '[1;6~'],
  ['prior',   '[5~',  '[5;2~', '[5;5~', '[5;6~'],
  ['delete',  '[3~',  '[3;2~', '[3;5~', '[3;6~'],
  ['numpad0', '[2~',  '[2;2~', '[2;5~', '[2;6~'],
  ['numpad1', '[4~',  '[4;2~', '[4;5~', '[4;6~'],
  ['numpad2', '[B',   '[1;2B', '[1;5B', '[1;6B'],
  ['numpad3', '[6~',  '[6;2~', '[6;5~', '[6;6~'],
  ['numpad4', '[D',   '[1;2D', '[1;5D', '[1;6D'],
  ['numpad5', '[G',   '[1;2G', '[1;5G', '[1;6G'],
  ['numpad6', '[C',   '[1;2C', '[1;5C', '[1;6C'],
  ['numpad7', '[A',   '[1;2A', '[1;5A', '[1;6A'],
  ['numpad8', '[1~',  '[1;2~', '[1;5~', '[1;6~'],
  ['numpad9', '[5~',  '[5;2~', '[5;5~', '[5;6~'],
  ['decimal', '[3~',  '[3;2~', '[3;5~', '[3;6~'],
  ['f1',      '[[A',  '[23~',  '[11^',  '[23^' ],
  ['f2',      '[[B',  '[24~',  '[12^',  '[24^' ],
  ['f3',      '[[C',  '[25~',  '[13^',  '[25^' ],
  ['f4',      '[[D',  '[26~',  '[14^',  '[26^' ],
  ['f5',      '[[E',  '[28~',  '[15^',  '[28^' ],
  ['f6',      '[17~', '[29~',  '[17^',  '[29^' ],
  ['f7',      '[18~', '[31~',  '[18^',  '[31^' ],
  ['f8',      '[19~', '[32~',  '[19^',  '[32^' ],
  ['f9',      '[20~', '[33~',  '[20^',  '[33^' ],
  ['f10',     '[21~', '[34~',  '[21^',  '[34^' ],
  ['f11',     '[23~', '[23$',  '[23^',  '[23@' ],
  ['f12',     '[24~', '[24$',  '[24^',  '[24@' ]
].reduce(function(out, set){
  set.slice(1).forEach(function(escape, i){
    out[escape] = map[i] + set[0]
  });
  return out;
}, {})


console.log(keybinds)


function numformat(a,b){if(!a||isNaN(+b))return b;var b=a.charAt(0)=='-'?-b:+b,
c=b<0?b=-b:0,d=a.match(/[^\d\-\+#]/g),e=d&&d[d.length-1]||'.',d=d&&d[1]&&d[0]||',',
a=a.split(e),b=b.toFixed(a[1]&&a[1].length),b=+b+'',f=a[1]&&a[1].lastIndexOf('0'),g=b.split('.');
if(!g[1]||g[1]&&g[1].length<=f)b=(+b).toFixed(f+1);f=a[0].split(d),a[0]=f.join('');
var h=a[0]&&a[0].indexOf('0');if(h>-1)for(;g[0].length<a[0].length-h;)g[0]='0'+g[0];
else+g[0]==0&&(g[0]='');b=b.split('.'),b[0]=g[0];if(g=f[1]&&f[f.length-1].length){
var f=b[0],h='',i=0,j=f.length;for(var k=f.length%g;i<j;i++)h+=f.charAt(i),
!((i-k+1)%g)&&i<j-g&&(h+=d);b[0]=h}return b[1]=a[1]&&b[1]?e+b[1]:'',(c?'-':'')+b[0]+b[1]}

*/