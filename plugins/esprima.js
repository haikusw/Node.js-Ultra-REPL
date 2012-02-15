var esprima = require('esprima');
var highlight = require('../lib/Highlighter.js')

module.exports = [{
    name: 'Generate AST',
    help: 'Use Esprima to generate AST for code to further debug and modify it.',
    defaultTrigger: api.command('.ast'),
    action: function(cmd, target){
      var code = this.context.run(target).completion;
      switch (typeof code) {
        case 'function': code += ''; break;
      }
      if (code) {
        var ast = esprima.parse(code);
        code = esprima.generate(ast, { indent: '  ' });
        return highlight(code);
      }
      return '';
    },
  },
  // { name: 'Analyze Input',
  //   help: 'Enables analysis of REPL input using Esprima in order to allow for code intel based actions.',
  //   defaultTrigger: api.command('.analyze'),
  //   action: api.toggle(options.execution, 'codeIntel')
  // },
  { name: 'Save Code',
    help: 'Format and output REPL code from this context',
    defaultTrigger: api.command('.save'),
    action: function(){
      var code = this.context.current.getExecutedCode();
      var ast = esprima.parse(code);
      code = esprima.generate(ast, { indent: '  ' });
      this.emit('save', code)
      return highlight(code);
    }
  }
];

