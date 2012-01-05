var coffee = require('coffee-script');
var heritable = require('../lib/object-utils').heritable;
var Context = require('../core/Context');
var style = require('../settings/styling');
var isError = require('../lib/object-utils').is('Error');

var CoffeeContext = heritable({
  constructor: function CoffeeContext(){
    this.coffee = true;
  },
  super: Context,
  //runCode: function runCode(code, filename){
  //  return Context.prototype.runCode.call(this, coffee.compile(code), filename);
  //},
  syntaxCheck: function syntaxCheck(src){
    try {
      return coffee.compile(src, { bare: true });
    } catch (e) {
      return e;
    }
  }
});

module.exports = [{
  name: 'Create Coffee Context',
  help: 'Create a new context that evaluates input as CoffeeScript',
  defaultTrigger: key('alt+c'),
  action: function(){
    var result = this.context.add(new CoffeeContext);
    if (isError(result)) {
      result = result.message.color(style.error);
    } else {
      result = 'created CoffeeContext '.color(style.context.create) + result.name;
    }
    this.rli.timedWrite('topright', result, 'bgbblack');
    this.refresh();
  }
}]


function keyword(x){ return { type: 'keyword', trigger: x } }
function dot(x){ return { type: 'command', trigger: '.' + x } }
function key(x){ return { type: 'keybind', trigger: x } }