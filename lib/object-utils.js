var callbind = Function.prototype.call.bind.bind(Function.prototype.call);
var applybind = Function.prototype.apply.bind.bind(Function.prototype.apply);

function callunbind(fn){
  return function(){
    return fn.apply(this, [this].concat(arguments));
  }
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

module.exports = {
	descriptor: descriptor,
  callunbind: callunbind,
  callbind: callbind,
  applybind: applybind
};