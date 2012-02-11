var esprima = require('esprima');

module.exports = [{
    name: 'Generate AST',
    help: 'Use Esprima to generate AST for code to further debug and modify it.',
    defaultTrigger: api.command('.ast'),

    action: function(cmd, target){
      // search executed code history first
      var source = this.context.current.history.filter(function(record){
        if (record.script && record.script.code) {
          return [ record.script.code, esprima.parse(record.script.code) ];
        }
        return ~history.globals.indexOf(target);
      }, []);

      if (source.length){
        source = source.map(function(s){ return s.code }).join('\n\n');  // found matching executed code in this context
      } else if (target in this.context.ctx && typeof this.context.ctx[target] === 'function') {
        source = this.context.ctx[target] + '';                          // search for matching functions and grab their source
      } else if (~builtins.libs.indexOf(target)) {
        source = process.binding('natives')[target];                     // search for builtin Node libs
      } else if (path.existsSync(target)) {
        source = fs.readFileSync(target, 'utf-8');                       // search for js files
      } else {
        source = target;                                                 // hope that the code itself was passed
      }
      try {
        return this.context.ctx.ast = esprima.parse(source).body;
      } catch (e) {
        return e;
      }
    },
  },
  { name: 'Analyze Input',
    help: 'Enables analysis of REPL input using Esprima in order to allow for code intel based actions.',
    defaultTrigger: api.command('.analyze'),
    action: api.toggle(options.execution, 'codeIntel')
}];

