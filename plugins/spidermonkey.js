var spawn = require('child_process').spawn;

var heritable = require('../lib/util/object-utils').heritable;
var isError = require('../lib/util/object-utils').is('Error');
var Context = require('../lib/Context');

var loc = path.resolve(__dirname, 'spidermonkey', 'js.exe');

module.exports = [
  { name: 'Spidermonkey Context',
    help: 'Create a context that runs code using SpiderMonkey.',
    defaultTrigger: api.command('.sm'),
    action: function(){
      var result = this.context.add(new SpiderMonkeyContext);
      if (isError(result)) {
        result = result.message.color(styling.error);
      } else {
        result = 'created SpiderMonkey Context '.color(styling.context.create) + result.name;
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