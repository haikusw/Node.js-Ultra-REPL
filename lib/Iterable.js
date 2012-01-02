
module.exports = {
  Iterable: Iterable,
  IterableIterator: IterableIterator
};



var iterables = new WeakMap;

function Iterable(){
  iterables.set(this, {
    __proto__: null,
    index:    0,
    items:    new Map,
    keys:     [],
    current:  undefined
  });
}

Iterable.prototype = {
  count: function count(){
    return iterables.get(this).keys.length;
  },

  add: function add(key, item){
    var collection = iterables.get(this);
    if (!collection.items.has(key)) {
      collection.keys.push(key);
    }
    collection.items.set(key, item);
  },

  remove: function remove(key){
    var collection = iterables.get(this);
    if (key === 0 || key > 0 && key < this.count()) {
      key = collection.keys[key];
    }
    collection.items.delete(key);
    var keyi = collection.keys.indexOf(key);
    collection.keys.splice(keyi, 1);
  },

  get: function get(key){
    var collection = iterables.get(this);
    if (key === 0 || key > 0 && key < this.count()) {
      var keyi = key;
    } else {
      var keyi = collection.keys.indexOf(key);
    }
    if (~keyi) {
      return collection.items.get(collection.keys[keyi]);
    }
  },

  __iterator__: function iterator(){
    return new IterableIterator(this);
  }
};

function IterableIterator(iterable){
  this.iterable = iterable;
  this.current = 0;
}

IterableIterator.prototype = {
  advance: function advance(change){
    var collection = iterables.get(this.iterable);
    this.current = (this.current + change + collection.keys.length) % collection.keys.length;
    return collection.items.get(collection.keys[this.current]);
  },
  next: function next(){
    return this.advance(1);
  },
  previous: function previous(){
    return this.advance(-1);
  },
  move: function move(index){
    var collection = iterables.get(this.iterable);
    if (index < collection.keys.length) {
      this.current = index;
    }
  },
  getCurrent: function getCurrent(){
    return this.iterable.get(this.current);
  },
  first: function first(){
    return this.move(0);
  },

  last: function last(){
    return this.move(this.iterable.count() - 1);
  },
}
