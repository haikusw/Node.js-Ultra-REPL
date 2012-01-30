module.exports = Dict;

function Pair(key, value){
  this.key = key;
  this.value = value;
}

Pair.prototype = Object.create(null);


var data = [];

function Dict(values){
  if (Object.getPrototypeOf(this) !== Dict.prototype) {
    return new Dict(values);
  }
  this.id = data.push(Object.create(null));
  if (values) {
    Object.keys(values).forEach(function(k){
      this[k] = values[k];
    }, this);
  }
}

Dict.prototype = {
  __proto__: null,
  get id(){},
  set id(v){ Object.defineProperty(this, 'id', { value: v }) },
  constructor: Dict,
  set: function set(key, value){
    if (Object(key) === key && key instanceof Pair) {
      return this[key.key] = key.value;
    } else {
      return this[key] = value;
    }
  },
  get: function get(key){ return this[key]; },
  has: function has(key){ return key in this; },
  remove: function remove(key){ return delete this[key]; },
  data: function data(key, value){
    if (typeof value === 'undefined') {
      return typeof key === 'undefined' ? data[this.id] : data[this.id][key];
    }
    data[this.id][key] = value;
  },
  get keys(){ return Object.keys(this); },
  get values(){ return this.keys.map(function(k){ return this[k] }, this); },
  get count(){ return this.keys.length; },
  forEach: function forEach(callback, context){
    this.keys.forEach(function(key){
      callback.call(context || this, new Pair(key, this[key]));
    }, this);
  },
  map: function map(callback, context){
    var out = new Dict, temp;
    this.keys.forEach(function(key){
      callback.call(context || this, temp = new Pair(key, this[key]));
      out.set(temp);
    }, this);
    return out;
  },
  clone: function clone(){ return this.map(function(pair){ return pair }); },
  toArray: function toArray(){ return this.keys.map(function(k){ return new Pair(k, this[k]) }, this); },
  join: function join(keySeparator, valueSeparator){
    keySeparator = keySeparator || ': ';
    return this.keys.map(function(k){
      return k + keySeparator + this[k];
    }, this).join(valueSeparator || ', ');
  },
  toString: function toString(){ return '{ ' + this.join() + ' }'; },
  toSource: function toSource(){ return 'new Dict(' + this + ')'; }
};
