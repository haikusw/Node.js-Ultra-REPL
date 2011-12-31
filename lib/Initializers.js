

function Initializer(children){
  if (children) this.children = children;
}

Initializer.prototype = Object.create(Object.prototype, {
  run: __(function run(target){
    this.children.forEach(function(child){
      child.run(target);
    });
  }),
  children: { value: Object.freeze([]) }
});




function Cloner(properties, source){
  this.properties = properties;
  this.target = target;
}

Cloner.prototype = Object.create(Initializer.prototype, {
  constructor: __(Cloner),
  run: __(function run(target){
    this.properties.forEach(function(prop){
      Object.defineProperty(target, prop,
         Object.getOwnPropertyDescriptor(this.source, prop));
    });
    Initializer.prototype.run.call(this);
  }),
  properties: { value: Object.freeze([]) }
});





function ScriptRunner(file){
  this.script = loadScript(file);
}

ScriptRunner.prototype = Object.create(Initializer.prototype, {
  constructor: __(ScriptRunner),
  run: __(function run(target){
    this.script.runInContext(target);
    Initializer.prototype.run.call(this);
  })
});


function loadScript(filepath) {
  var resolved = filepath;
  if (!path.existsSync(resolved)) {
    resolved = path.resolve(path.dirname(module.filename), resolved);
    if (!path.existsSync(resolved)) {
      resolved = path.resolve('../lib', resolved);
      if (!path.existsSync(resolved)) {
        throw new Error("File " + filepath + " not found");
      }
    }
  }
  var source = fs.readFileSync(resolved, 'utf8')
  var script = vm.createScript(source, path.basename(filepath));
  return script;
}



var initializers = {
  nodeBuiltins: new Cloner(builtins.node, global)
};
