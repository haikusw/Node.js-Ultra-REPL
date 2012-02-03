var vm = require('vm');

var Script = require('./Script');
var Context = require('./Context');
var NativeModule = new Script('./NativeModule.js');

require('./UltraREPL')

module.exports = NodeContext;

function NodeContext(globalSettings, mainModule, isGlobal){
  Context.call(this, globalSettings);
  if (mainModule) {
    this.initRequire(mainModule)
  }
}

NodeContext.upgradeContext = function upgradeContext(context){
  context.__proto__ = NodeContext.prototype;
}

NodeContext.prototype = {
  __proto__: Context.prototype,
  constructor: NodeContext,

  initProcess: function initProcess(){
    if (this.process) return this.process;

    var evals = evalsWrapper(this.ctx);
    this.ctx.process = processWrapper(evals);

    Object.defineProperty(this, 'process', {
      value: this.ctx.process,
      configurable: true,
      enumerable: true
    });

    this.refresh();
    return this.ctx.process;
  },

  initModule: function initModule(path){
    if (this.module) return this.module;

    var init = NativeModule.run(this.ctx);
    var loadMainModule = init(this.initProcess());
    var exports = loadMainModule(path);

    Object.defineProperty(this, 'mainModule', {
      value: this.process.mainModule,
      enumerable: true,
      configurable: true
    });

    this.refresh();
    return this.process.mainModule;
  },

  initRequire: function initRequire(initpath){
    if (this.require) return this.require;

    var exports = this.initModule(initpath);

    Object.defineProperty(this, 'require', {
      value: this.process.mainModule.require,
      enumerable: true,
      configurable: true
    });

    return this.process.mainModule.require;
  },
  initEmptyMain: function initEmptyMain(){
    this.process = this.initProcess();
    var init = NativeModule.run(this.ctx);
    this.setGlobal();
    this.ctx.loadMainModule = init(this.process);
    return this.ctx.loadMainModule;
  }
};



function cloneProps(target, source, props){
  return props.reduce(function(r,s){
    Object.defineProperty(r, s, Object.getOwnPropertyDescriptor(source, s));
    return r;
  }, target);
}

function wrapFuncs(target, source, props){
  props.forEach(function(prop){
    var desc = Object.getOwnPropertyDescriptor(source, prop);
    if (desc) {
      var oldfunc = desc.value;
      desc.val = function(){ return oldfunction.apply(this, arguments) }
      Object.defineProperty(target, prop, desc);
    }
  })
}


function processWrapper(evals){
  var _process = Object.create(Object.getPrototypeOf(process));
  _process.argv = [process.argv[0]];
  _process.binding = function(name){ return name === 'evals' ? evals : process.binding(name) };
  _process.moduleLoadList = [];
  cloneProps(_process, process, ['stdin', 'stdout', 'stderr', 'title']);
  cloneProps(_process, process, [ 'arch', 'platform', 'version', 'versions', 'tid', 'pid', 'features', 'execPath', 'env' ]);
  wrapFuncs(_process, process, [ 'uptime', 'memoryUsage', 'chdir', 'cwd', 'dlopen', 'uvCounters', '_cwdForDrive', 'umask', '_needTickCallback' ]);
  return _process;
  // var hidden = [ 'exit',  '_kill',  'kill:',  '_debugProcess',  '_debugPause']
}


var evalsWrapper = function(){
  var evals = process.binding('evals');
  var Context = evals.Context;
  var NodeScript = evals.NodeScript;
  var Proto = NodeScript.prototype;

  var NewNodeScript = function NodeScript(){
    var script = new (NodeScript.bind.apply(NodeScript, [null].concat([].slice.call(arguments))));
    script.__proto__ = NewNodeScript.prototype;
    return script;
  }

  return function evalsWrapper(ctx){

    NewNodeScript.runInThisContext = function(code, filename, ret){
      return NodeScript.runInContext(code, ctx, filename, ret);
    }
    NewNodeScript.runInContext = NodeScript.runInContext;
    NewNodeScript.createContext = NodeScript.createContext;
    NewNodeScript.runInNewContext = NodeScript.runInNewContext;

    NewNodeScript.prototype = {
      __proto__: NodeScript,
      constructor: NewNodeScript,
      runInContext: Proto.runInContext,
      createContext: Proto.createContext,
      runInNewContext: Proto.runInNewContext,
      runInThisContext: function runInThisContext(){
        return Proto.runInContext.call(this, ctx);
      }
    };

    return { NodeScript: NewNodeScript, Context: Context };
  }
}();