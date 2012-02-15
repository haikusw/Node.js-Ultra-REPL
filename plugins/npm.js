var EventEmitter = require('events').EventEmitter;

var npm;
var log = new EventEmitter;

require('npm').load(function(e,NPM){
  NPM.on('output', function(){
    log.emit('message', NPM.output.message);
    NPM.output = null;
  });
  npm = NPM;
});

module.exports = [
  { name: 'npm command',
    help: 'Execute an npm command.',
    defaultTrigger: api.command('.npm'),
    action: function(cmd, params){
      var self = this;
      params = params.split(' ');
      cmd = params.shift();
      npm[cmd](params.join(' '), function(e, data){
        self.writer(data);
      });
    }
  }
];
