var callbind = Function.prototype.bind.bind(Function.prototype.call);
var applybind = Function.prototype.bind.bind(Function.prototype.apply);
var slice = callbind(Array.prototype.slice);


module.exports = {
  heritable: heritable,
  descriptor: descriptor,
  callbind: callbind,
  applybind: applybind,
  lazyProperty: lazyProperty,
  is: is
};

function is(compare){
  if (typeof compare === 'string') {
    compare = '[object ' + compare + ']';
  } else {
    compare = Object.prototype.toString.call(compare);
  }
  if (compare in is) return is[compare];
  return is[compare] = function(o){
    return Object.prototype.toString.call(o) === compare;
  }
}

function clone(o){
  var names = Object.getOwnPropertyNames(o);
  return Object.create(Object.getPrototypeOf(o), 
                 names.map(Object.getOwnPropertyDescriptor.bind(null, o))
                 .reduce(function(r,d,i){ r[names[i]] = d; return r; }, {}));
}

function descriptor(val, h, r){
  var desc = { enumerable: !h, configurable: true };
  if (Array.isArray(val) && val.length === 2 &&
       typeof val[0] === 'function' &&
       typeof val[1] === 'function') {
    desc.get = val[0];
    desc.set = val[1];
  } else if (typeof val === 'function' && /^[gs]etter$/.test(val.name)) {
    desc[val.name[0]+'et'] = val;
  } else {
    desc.value = val;
    desc.writable = !r;
  }
  return desc;
}

function heritable(definition){
  var ctor = definition.constructor;
  Object.defineProperty(ctor, 'super', {
    value: definition.super,
    configurable: true,
    writable: true
  });
  ctor.prototype = Object.create(ctor.super.prototype);
  delete definition.super;

  Object.keys(definition).forEach(function(prop){
    var desc = Object.getOwnPropertyDescriptor(definition, prop);
    desc.enumerable = false;
    Object.defineProperty(ctor.prototype, prop, desc);
  });

  function construct(){
    var obj = new (ctor.bind.apply(ctor, [null].concat(slice(arguments))));
    ctor.super.call(obj);
    return obj;
  }

  construct.prototype = ctor.prototype;

  return construct;
}


function lazyProperty(obj, name){
  if (Array.isArray(name)) {
    name.forEach(function(prop){ lazyProperty(obj, prop) });
    return obj;
  }
  var visible = name[0] === '$';
  name = visible ? name.slice(1) : name;
  Object.defineProperty(obj, name, {
    configurable: true,
    enumerable: visible,
    get: function(){},
    set: function(v){ Object.defineProperty(this, name, { value: v, writable: true }) }
  });
}

