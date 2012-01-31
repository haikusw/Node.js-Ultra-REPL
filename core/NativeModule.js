'Proxy' in this && Object.defineProperty(this, 'Proxy', { enumerable: false });
var global = this;
(function initModule(process){

  var Script = process.binding('evals').NodeScript;
  var runInThisContext = Script.runInThisContext;

  function NativeModule(id) {
    this.filename = id + '.js';
    this.id = id;
    this.exports = {};
    this.loaded = false;
  }

  NativeModule._source = process.binding('natives');
  NativeModule._cache = {};

  NativeModule.require = function(id) {
    if (id == 'native_module') {
      return NativeModule;
    }

    var cached = NativeModule.getCached(id);
    if (cached) {
      return cached.exports;
    }

    if (!NativeModule.exists(id)) {
      throw new Error('No such native module ' + id);
    }

    process.moduleLoadList.push('NativeModule ' + id);

    var nativeModule = new NativeModule(id);

    nativeModule.compile();
    nativeModule.cache();

    return nativeModule.exports;
  };

  NativeModule.getCached = function(id) {
    return NativeModule._cache[id];
  };

  NativeModule.exists = function(id) {
    return (id in NativeModule._source);
  };

  NativeModule.getSource = function(id) {
    return NativeModule._source[id];
  };

  NativeModule.wrap = function(script) {
    return NativeModule.wrapper[0] + script + NativeModule.wrapper[1];
  };

  NativeModule.wrapper = [
    '(function (exports, require, module, __filename, __dirname) { ',
    '\n});'
  ];

  NativeModule.prototype.compile = function() {
    var source = NativeModule.getSource(this.id);
    source = NativeModule.wrap(source);

    var fn = runInThisContext(source, this.filename);
    fn(this.exports, NativeModule.require, this, this.filename);

    this.loaded = true;
  };

  NativeModule.prototype.cache = function() {
    NativeModule._cache[this.id] = this;
  };

  NativeModule.prototype.deprecate = function(method, message) {
    var original = this.exports[method];
    var self = this;

    Object.defineProperty(this.exports, method, {
      enumerable: false,
      value: function() {
        message = self.id + '.' + method + ' is deprecated. ' + (message || '');

        if ((new RegExp('\\b' + self.id + '\\b')).test(process.env.NODE_DEBUG))
          console.trace(message);
        else
          console.error(message);

        self.exports[method] = original;
        return original.apply(this, arguments);
      }
    });
  }

  function initGlobals(){
    if (initGlobals.run) return;
    initGlobals.run = true;


    function processNextTick() {
      var nextTickQueue = [];

      process._tickCallback = function() {
        var l = nextTickQueue.length;
        if (l === 0) return;

        var q = nextTickQueue;
        nextTickQueue = [];

        try {
          for (var i = 0; i < l; i++) q[i]();
        }
        catch (e) {
          if (i + 1 < l) {
            nextTickQueue = q.slice(i + 1).concat(nextTickQueue);
          }
          if (nextTickQueue.length) {
            process._needTickCallback();
          }
          throw e; // process.nextTick error, or 'error' event on first tick
        }
      };

      process.nextTick = function(callback) {
        nextTickQueue.push(callback);
        process._needTickCallback();
      };
    }

    global.Buffer = NativeModule.require('buffer').Buffer;

    var typedArrays = process.binding('typed_array');
    for (var k in typedArrays) {
      global[k] = typedArrays[k];
    }


    global.setTimeout = function() {
      var t = NativeModule.require('timers');
      return t.setTimeout.apply(this, arguments);
    };

    global.setInterval = function() {
      var t = NativeModule.require('timers');
      return t.setInterval.apply(this, arguments);
    };

    global.clearTimeout = function() {
      var t = NativeModule.require('timers');
      return t.clearTimeout.apply(this, arguments);
    };

    global.clearInterval = function() {
      var t = NativeModule.require('timers');
      return t.clearInterval.apply(this, arguments);
    };
  }

  return function mainModule(modulePath){
    var Module = NativeModule.require('module');
    var path = NativeModule.require('path');
    var cwd = process.cwd();
    process.argv[1] = path.resolve(modulePath);
    return Module._load(process.argv[1], null, true);
  }
})