var __ = require('./object-utils').descriptor;


module.exports = {
  Iterable: Iterable,
  IterableIterator: IterableIterator
};



var iterables = new WeakMap;

function Iterable(){
  iterables.set(this, Object.create(null, {
    index:    __(0),
    items:    __(new Map),
    keys:     __([]),
    current:  __(undefined)
  }));
}

Iterable.prototype = Object.create(Object.prototype, {
  count: __(function count(){
    return iterables.get(this).keys.length;
  }),

  add: __(function add(key, item){
    var collection = iterables.get(this);
    if (!collection.items.has(key)) {
      collection.keys.push(key);
    }
    collection.items.set(key, item);
  }),

  remove: __(function remove(key){
    var collection = iterables.get(this);
    if (key === 0 || key > 0 && key < this.count()) {
      key = collection.keys[key];
    }
    collection.items.delete(key);
    var keyi = collection.keys.indexOf(key);
    collection.keys.splice(keyi, 1);
  }),

  get: __(function get(key){
    var collection = iterables.get(this);
    if (key === 0 || key > 0 && key < this.count()) {
      var keyi = key;
    } else {
      var keyi = collection.keys.indexOf(key);
    }
    if (~keyi) {
      return collection.items.get(collection.keys[keyi]);
    }
  }),

  __iterator__: __(function iterator(){
    return new IterableIterator(this);
  })
});

function IterableIterator(iterable){
  this.iterable = iterable;
  this.current = 0;
}

IterableIterator.prototype = Object.create(Object.prototype, {
  advance: __(function advance(change){
    var collection = iterables.get(this.iterable);
    this.current = (this.current + change + collection.keys.length) % collection.keys.length;
    return collection.items.get(collection.keys[this.current]);
  }),
  next: __(function next(){
    return this.advance(1);
  }),
  previous: __(function previous(){
    return this.advance(-1);
  }),
  move: __(function move(index){
    var collection = iterables.get(this.iterable);
    if (index < collection.keys.length) {
      this.current = index;
    }
  }),
  getCurrent: __(function getCurrent(){
    return this.iterable.get(this.current);
  }),
  first: __(function first(){
    return this.move(0);
  }),

  last: __(function last(){
    return this.move(this.iterable.count() - 1);
  }),
})
