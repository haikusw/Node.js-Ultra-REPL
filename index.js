var path = require('path');
var ScopedModule = require('./lib/ScopedModule');


setTimeout(function(){
  var UltraREPL = ScopedModule._load(__dirname + '/lib/UltraREPL.js', null, true);
  new UltraREPL;
}, 50)

