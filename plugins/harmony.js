var fs = require('fs');
var path = require('path');
var exists = fs.existsSync || path.existsSync;


// npm install direct-proxies
var shim = require('direct-proxies').shim;



module.exports = [{
  name: 'Shim Direct-Proxies',
  help: 'Shims `Proxy` on the current context to use the Direct-Proxies shim.',
  defaultTrigger: { type: 'command', trigger: '.dp' },
  action: function(){
    shim(this.context.ctx);
    return this.context.ctx.Proxy;
  }
}];
