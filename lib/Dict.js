module.exports = Dict;

var pairs = new WeakMap;

function Pair(key, value){
  var pair = Object.create(null);
  pair.key = key;
  pair.value = value;
  pairs.set(pair, true);
  return pair;
}


var dictData = new WeakMap;

function Dict(values){
  if (this.__proto__ !== Dict.prototype) {
    return new Dict(values);
  }
  var props = dictData.set(this, Object.create(null));
  if (values) {
    Object.keys(values).forEach(function(k){
      this[k] = values[k];
    }, this);
  }
}

Dict.prototype = {
  __proto__: null,
  constructor: Dict,
  set: function set(key, value){
    if (Object(key) === key && pairs.has(key)) {
      return this[key.key] = key.value;
    } else {
      return this[key] = value;
    }
  },
  get: function get(key){
    return this[key];
  },
  has: function has(key){
    return key in this;
  },
  delete: function del(key){
    return delete this[key];
  },
  data: function data(key, value){
    var store = dictData.get(this);
    if (typeof value === 'undefined' ) {
      return typeof key === 'undefined' ? data : data[key];
    }
    store[key] = value;
  },
  get keys(){
    return Object.keys(this);
  },
  get values(){
    return this.keys.map(function(k){
      return this[k];
    }, this);
  },
  get count(){
    return this.keys.length;
  },
  forEach: function forEach(callback, context){
    this.keys.forEach(function(key){
      callback.call(context || this, Pair(key, this[key]));
    }, this);
  },
  map: function map(callback, context){
    var out = new Dict, temp;
    this.keys.forEach(function(key){
      callback.call(context || this, temp = Pair(key, this[key]));
      out.set(temp);
    }, this);
    return out;
  },
  clone: function clone(){
    return this.map(function(pair){
      return pair;
    });
  },
  toArray: function toArray(){
    return this.keys.map(function(k){
      return Pair(k, this[k]);
    }, this);
  },
  join: function join(keySeparator, valueSeparator){
    keySeparator = keySeparator || ': ';
    return this.keys.map(function(k){
      return k + keySeparator + this[k];
    }, this).join(valueSeparator || ', ');
  },
  toString: function toString(){
    return '{ ' + this.join() + ' }';
  },
  toSource: function toSource(){
    return 'new Dict(' + this + ')';
  }
};