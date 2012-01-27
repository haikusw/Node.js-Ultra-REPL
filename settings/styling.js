var styling = function(){
  return {
    error: red2,
    errorbg: [bg_red1, white2],
    success: green2,

    inspector: {
      header      : bg_blue1,

      // falsey
      Undefined   : black2,
      Null        : black2,
      // constructor functions
      Constructor : cyan2,
      Proto       : red2,
      // normal types
      Function    : cyan1,
      Boolean     : magenta1,
      Date        : red2,
      Error       : red2,
      Number      : magenta2,
      RegExp      : red2,
      // property names and strings
      HString     : green1,
      String      : green2,
      HConstant   : yellow1,
      Constant    : yellow2,
      HName       : black2,
      Name        : white2,
      // meta-labels
      More        : red1,
      Accessor    : magenta1,
      Circular    : red1,
      // brackets
      Square      : white1,
      Curly       : white1
    },
    syntax: {
      curly           : blue2,
      square          : blue2,
      round           : blue1,
      punctuation     : white1,
      string          : green2,
      number          : green2,
      def             : yellow1,
      property        : cyan1,
      variable        : cyan2,
      variable2       : yellow1,
      comment         : black2,
      operator        : red2,
      conditional     : magenta1,
      loop            : magenta1,
      scope           : [bg_green1, white2],
      trycatch        : magenta1,
      declaration     : magenta1,
      control         : magenta1,
      member          : magenta2,
      atom            : blue2,
      special         : red2,
      builtin_method  : red1,
      builtin_object  : red1,
      builtin_class   : yellow2,
    },

    help: {
      intro: green2,
      names: cyan1,
      keybind: yellow1,
      keyword: magenta1,
      command: green1,
      keywords: yellow2
    },
    intro: [ yellow2, red2 ],
    prompt: {
      separator: [' ◊ ', green1],
      end: [' » ', cyan1],
      '--': yellow1,
      '++': yellow2,
      number: yellow1
    },
    info: {
      header: bg_cyan1,
      page: [bg_cyan1, white2],
      keydisplay: [bg_cyan1, black1],
      cadenceDone: red2,
      cadenceLeft: red1
    },
    context: {
      create: green1,
      remove: red1,
      reset:  magenta1,
      names:  [  green2, yellow2, magenta2, cyan2,
                 yellow1, magenta1, cyan1, blue2 ]
    },
  };
}



var red1     = 'red';
var red2     = 'bred';
var blue1    = 'blue';
var blue2    = 'bblue';
var cyan1    = 'cyan';
var cyan2    = 'bcyan';
var green1   = 'green';
var green2   = 'bgreen';
var black1   = 'black';
var black2   = 'bblack';
var white1   = 'white';
var white2   = 'bwhite';
var yellow1  = 'yellow';
var yellow2  = 'byellow';
var magenta1 = 'magenta';
var magenta2 = 'bmagenta';

var bg_red1     = 'bgred';
var bg_red2     = 'bgbred';
var bg_blue1    = 'bgblue';
var bg_blue2    = 'bgbblue';
var bg_cyan1    = 'bgcyan';
var bg_cyan2    = 'bgbcyan';
var bg_green1   = 'bggreen';
var bg_green2   = 'bgbgreen';
var bg_black1   = 'bgblack';
var bg_black2   = 'bgbblack';
var bg_white1   = 'bgwhite';
var bg_white2   = 'bgbwhite';
var bg_yellow1  = 'bgyellow';
var bg_yellow2  = 'bgbyellow';
var bg_magenta1 = 'bgmagenta';
var bg_magenta2 = 'bgbmagenta';


module.exports = styling();