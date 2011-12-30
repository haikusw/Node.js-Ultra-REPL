var callbind = Function.prototype.call.bind.bind(Function.prototype.call);
var applybind = Function.prototype.apply.bind.bind(Function.prototype.apply);

function callunbind(fn){
  return function(){
    return fn.apply(this, [this].concat(arguments));
  }
}

function descriptor(val, h, r){
  var d = { configurable: true, enumerable: true, writable: true };
  if (h === true) {      d.enumerable = false;
    if (r === true)      d.readonly = false;
  } else if (r === true) d.readonly = false;
  d.value = val;
  return d;
}

function accessor(fns, h){
	if (!Array.isArray(fns)) {
		fns = [fns];
	}
	return {
		get: fns[0],
		set: fns[1],
		enumerable: !h,
		configurable: true
	};
}

module.exports = {
	descriptor: descriptor,
	accessor: accessor,
  callunbind: callunbind,
  callbind: callbind,
  applybind: applybind
};