var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;

var heritable = require('../lib/object-utils').heritable;
var Context = require('../core/Context');
var style = require('../settings/styling');
var isError = require('../lib/object-utils').is('Error');

var loc = path.resolve(__dirname, 'spidermonkey', 'js.exe');

module.exports = [
  { name: 'Spidermonkey Context',
    help: 'Create a context that runs code using SpiderMonkey.',
    defaultTrigger: { type: 'command', trigger: '.sm' },
    action: function(){
      var result = this.context.add(new SpiderMonkeyContext);
      if (isError(result)) {
        result = result.message.color(style.error);
      } else {
        result = 'created SpiderMonkey Context '.color(style.context.create) + result.name;
      }
      this.rli.timedWrite('topright', result, 'bgbblack');
      this.refresh();
    }
  }
];


var SpiderMonkeyContext = heritable({
  constructor: function SpiderMonkeyContext(){
    var sm = this.spidermonkey = spawn(loc, [], { cwd: process.cwd() });
  },
  super: Context,
  runCode: function runCode(code, filename, finalize){
    this.protos = false;
    this.spidermonkey.stdout.once('data', function(data){
      data = data.toString('utf8').replace(/\r?\njs> $/, '');
      try { data = eval(data.replace(/\[native code\]/g, '')) } catch (e) { }
      finalize({
         status: 'success',
         text: data,
         code: code
      });
    });
    this.spidermonkey.stdin.write(code + '\n');
    return 'async';
  }
});