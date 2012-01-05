var esprima = require('esprima');
var builtins = require('../settings/builtins');

module.exports = [{
  name: 'Generate AST',
  help: 'In progress. Use Esprima to generate AST for code to further debug and modify it.',
  defaultTrigger: { type: 'command', trigger: '.ast' },

  action: function(cmd, target){
    // search executed code history first
    var source = this.context.current.scripts.reduce(function(r, t){
      if (~t.globals.indexOf(target)) {
        r.push(t.code);
      }
      return r;
    }, []);

    if (source.length){

      // found matching executed code in this context
      source = source.join('\n\n');

    } else if (target in this.context.ctx && typeof this.context.ctx[target] === 'function') {

      // search for matching functions and grab their source
      source = this.context.ctx[target] + '';

    } else if (~builtins.libs.indexOf(target)) {

      // search for builtin Node libs
      source = process.binding('natives')[target];

    } else if (path.existsSync(target)) {

      // search for js files
      source = fs.readFileSync(target, 'utf-8');

    } else if (typeof target === 'string') {

      // hope that the code itself was passed
      source = target;

    } else {
      this.context._ = new Error('Unable to Find a Match');
      return this.inspector(this.context._);
    }

    this.context._ = this.context.ctx.ast = esprima.parse(source).body;
    this.inspector(this.context._);
  }
}];