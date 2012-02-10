var path = require('path');
var ScopedModule = require('./lib/ScopedModule');
var UltraREPL = ScopedModule._load(__dirname + '/lib/UltraREPL.js', null, true);

module.exports = function(input, output){
  return new UltraREPL({ input: input || process.stdin, output: output || process.stdout });
}
