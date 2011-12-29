var colors = require('./colors');

module.exports = function(repl){
  repl.ui = layer(repl);
}

function ansilength(str){
  return str.replace(/\033\[(?:[12]2?;)?3\dm/g, '').length
}

function clampYAt(height){
  height--;
  return function clampY(y) {
    return y < 0 ? 0 : y > height ? height : y;
  }
}

function clampXAt(width){
  return function clampX(x) {
    return x < 0 ? 0 : x > width ? width : x;
  }
}

function layer(repl){
  var rli = repl.rli;
  var out = rli.output;
  var width = out.getWindowSize()[0];
  var height = out.getWindowSize()[1];
  var clampy = clampYAt(height);
  var clampy = clampXAt(height);


  rli.input.on('data', function(data){
    var lines = (data+'').trim().split(/[\r\n]/).length;
    if (lines) ui.addLines(lines);
  });


  var Node = colors('Node', 'bblack') + colors('.', 'byellow') + colors('js', 'bgreen');
  var _x = rli._promptLength + rli.cursor;
  var _y = height;


  function render(){
    ui.writeAt([-0, 0], (_x - rli._promptLength) + ' ' + Node);
    ui.writeAt([-0, height], colors('builtins', repl.settings.hideBuiltins ? 'bblack' : 'white'));
  }


  rli.input.on('keypress', function(line, key){
    _x = rli._promptLength + rli.cursor;
    if (key && key.name === 'enter') {
      _y += 2;
    }
    render();
  });

  var ui = {
    addLines: function(str){
      str = (''+str);
      var count = str.length - str.replace(/[^\\]\n/g, '').length;
      if (count > 0) {
        _y = clampy(_y + count);
      }
    },
    writeAt: function(loc, text){
      var x = _x, y = _y;
      if (!Array.isArray(loc)) loc = [loc, y];
      if (1 / loc[0] === -Infinity) loc[0] = -1;
      if (loc[0] < 0) loc[0] = width - ansilength(text) + loc[0];
      this.xy = loc;
      this.write(text);
      this.xy = [x, y];
    },
    refreshLine: function refreshLine(){
      this.x = 0;
      this.write(rli._prompt + rli.line);
      this.x = rli._promptLength + rli.cursor;
    },
    write: rli.output.write.bind(rli.output),
    set xy(xy){
      rli.output.cursorTo(_x = clampx(xy[0]), _y = clampy(xy[1]));
    },
    set y(y){
      rli.output.cursorTo(_x, _y = clampy(y));
    },
    set x(x){
      rli.output.cursorTo(_x = clampx(x));
    },
    get y(){ return _y },
    get x(){ return _x },
    get cursor( ){ return rli.cursor },
    set cursor(v){ return rli.output.moveCursor(v) },
    move: function move(x,y){
      _x = clampx(_x + x);
      _y = clampy(_y + y);
      screen.moveCursor(x, y);
    },
    moveX: function moveX(x){
      _x = clampx(_x + x);
      screen.moveCursor(x, 0);
    },
    moveY: function moveY(y){
      _y = clampy(_y + y);
      rli.output.moveCursor(0, y);
    },
    clear: function clear(d){
      for (var y = height; y >= -1; y--) {
        ui.y = _y = y;
        rli.output.clearLine(d);
      }
      setTimeout(function(){
        rli.output.clearLine(d);
        render();
      }, 10);
    },
    clearLeftOf: function clearLeftOf(x){
      var oldy = _y;
      this.x = x;
      this.clear(-1);
      _y = oldy;
    },
    clearRightOf: function clearRightOf(x){
      var oldy = _y;
      this.x = x;
      this.clear(1);
      _y = oldy;
    }
  };
  ui.write(Array(height).join('\n'));
  ui.y = height - 1;
  repl.bufferedCommand = '';
  repl.updatePrompt();
  render();
  return ui;
}






function positioner(rli){
  var iface = layer(rli);
  var entities = [];

  function MountPoint(x, y){
    this.x = x; this.y = y;
    rli.on('line', this.refresh.bind(this));
  }

  MountPoint.prototype = Object.create(layer(rli), {
    constructor: __(MountPoint),
    write: __(function write(content){
      this.content = content;
      this.refresh();
    }),
    refresh: __(function refresh(){
      this.setX()
    })
  });

}



function __(val, h, r){
  var d = { configurable: true, enumerable: true, writable: true };
  if (h === true) {      d.enumerable = false;
    if (r === true)      d.readonly = false;
  } else if (r === true) d.readonly = false;
  d.value = val;
  return d;
}