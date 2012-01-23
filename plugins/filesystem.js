var fs = require('fs');
var path = require('path');

module.exports = [
  { name: 'Current Directory',
    help: 'List the files in the current working directory',
    defaultTrigger: { type: 'command', trigger: '.cwd' },
    action: function(){
      var cwd = process.cwd(), longest = 0;
      return cwd.color('bgreen') + '\n' + fs.readdirSync(cwd).map(function(s){
        var stat = fs.statSync(cwd + '/' + s);
        if (s.length > longest) longest = s.length;
        return {
          name: s,
          stat: stat,
          type: ftype(stat)
        };
      }).sort(function(a, b){
        return a.type === b.type ? a.name : b.type - a.type;
      }).map(function(f){
        return '  ' + f.name.pad(longest + 3).color('cyan') + types[f.type]
      }).join('\n');
    }
  },
];

var types = [ 'File', 'Directory', 'BlockDevice', 'SymbolicLink', 'Socket', 'CharacterDevice', 'FIFO' ];
function ftype(stats){
  var i = -1;
  types.some(function(type){ i++; return stats['is' + type]() });
  return i;
}
